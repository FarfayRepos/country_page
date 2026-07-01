import { useState, useEffect, useCallback } from "react"
import "../../CSS/Contabilidad.css"
import "../../CSS/DashboardCaballos.css"
import "../../CSS/InicioAnalisis.css"
import {
  Users, CalendarDays, XCircle, UserCheck, TrendingUp, TrendingDown,
  LayoutGrid, GraduationCap, BarChart3, CalendarClock, AlertTriangle, ArrowRight,
} from "lucide-react"
import { MiniArea, MiniBars, MiniDonut, MiniHBars, Heatmap, ChartEmpty } from "./MiniCharts"

// Vista de ANÁLISIS del panel de inicio. Consume /api/metricas/inicio-analisis
// (reservas/servicio con comparación vs. periodo anterior) y combina con las
// props de clientes/pagos que ya calcula Contabilidad. Sin cifras de dinero.
const IS_LOCAL =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
const API = IS_LOCAL
  ? "http://localhost:3001/api/metricas/inicio-analisis"
  : "https://elrefugiocountryclub.com/api/api/metricas/inicio-analisis"

const PALETTE = ["#3b7a9c", "#9caf88", "#e0a458", "#c17b4a", "#7d5ba6"]
const ESTATUS_COLOR = { confirmada: "#3b7a9c", pendiente: "#e0a458", completada: "#9caf88", cancelada: "#c17b4a" }
const DOW_NOMBRE = { 1: "Dom", 2: "Lun", 3: "Mar", 4: "Mié", 5: "Jue", 6: "Vie", 7: "Sáb" }
const firstName = (full) => (full || "").trim().split(/\s+/)[0] || full

const pad = (n) => String(n).padStart(2, "0")
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const ddmm = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
// "YYYY-MM-DD" → "Mié 25 jun" (día de la semana + día + mes por nombre).
const fechaLarga = (s) => {
  const d = new Date(s + "T00:00:00Z")
  return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`
}
function rangoPreset(p) {
  const hoy = new Date()
  const hasta = fmt(hoy)
  if (p === "semana") { const d = new Date(hoy); d.setDate(hoy.getDate() - 6); return { desde: fmt(d), hasta } }
  return { desde: fmt(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta } // mes
}

// Badge de variación (flecha + color). goodWhenDown invierte el criterio (p. ej. cancelación).
function Delta({ value, unit = "%", goodWhenDown = false, sub }) {
  const good = goodWhenDown ? value < 0 : value > 0
  const cls = value === 0 ? "ia-flat" : good ? "ia-good" : "ia-bad"
  return (
    <div className="kpi-trend">
      <span className={`kpi-trend-badge ia-delta ${cls}`}>
        {value > 0 && <TrendingUp size={13} />}
        {value < 0 && <TrendingDown size={13} />}
        {value >= 0 ? "+" : ""}{value}{unit}
      </span>
      <span className="kpi-trend-sub">{sub}</span>
    </div>
  )
}

export default function InicioAnalisis({
  headerRef,
  currentUser,
  totalUsers = 0,
  activeUsers = 0,
  blockedUsers = 0,
  pendingUsers = 0,
  clientsGrowthPct = 0,
  availableHorses = 0,
  totalHorses = 0,
  overdueCount = 0,
  soonCount = 0,
  setActiveTab = () => {},
}) {
  const [periodo, setPeriodo] = useState("mes") // mes | semana | rango
  const [rango, setRango] = useState(() => rangoPreset("mes"))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const { desde, hasta } = rango

  const cargar = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ desde, hasta })
    fetch(`${API}?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [desde, hasta])

  useEffect(() => { cargar() }, [cargar])

  const elegirPeriodo = (p) => {
    setPeriodo(p)
    if (p !== "rango") setRango(rangoPreset(p))
  }

  const k = data?.kpis
  const tendenciaData = (data?.tendencia || []).map((t) => ({ label: fechaLarga(t.dia), value: t.total }))
  const estatusSegments = (data?.reservas_estatus || []).map((e) => ({
    label: e.estatus.charAt(0).toUpperCase() + e.estatus.slice(1), value: e.total, color: ESTATUS_COLOR[e.estatus] || "#b8a78f",
  }))
  // Reservas por horario (agregando el mapa de calor, ya filtrado por periodo).
  const horaMap = new Map()
  for (const cel of (data?.heatmap || [])) horaMap.set(cel.hora, (horaMap.get(cel.hora) || 0) + cel.total)
  const porHora = [...horaMap.entries()].sort((a, b) => a[0] - b[0]).map(([h, v]) => ({
    label: `${h}:00`,
    tipLabel: `${h}:00–${h + 1}:00 h`,
    value: v,
  }))
  const horaPico = porHora.reduce((m, d) => (d.value > (m?.value || 0) ? d : m), null)
  const porHoraData = porHora.map((d) => ({ ...d, color: horaPico && d.label === horaPico.label ? "#3b7a9c" : "#cdbfa9" }))

  const instructorasData = (data?.clases_instructora || []).map((i) => ({ label: firstName(i.nombre), value: i.total }))
  const demandaData = (data?.demanda_nivel || []).map((d, i) => ({ label: d.nivel, value: d.demanda, color: PALETTE[i % PALETTE.length] }))

  // --- Insights automáticos ---
  const insights = []
  if (k) {
    insights.push({ tone: k.reservas_delta_pct >= 0 ? "ok" : "warn", text: `Reservas ${k.reservas_delta_pct >= 0 ? "+" : ""}${k.reservas_delta_pct}% vs. periodo anterior (${k.reservas} en total).` })
    insights.push({ tone: k.cancelacion_delta_pts <= 0 ? "ok" : "warn", text: `Tasa de cancelación ${k.cancelacion_pct}% (${k.cancelacion_delta_pts >= 0 ? "+" : ""}${k.cancelacion_delta_pts} pts vs. periodo anterior).` })
  }
  const pico = (data?.heatmap || []).reduce((m, c) => (c.total > (m?.total || 0) ? c : m), null)
  if (pico) insights.push({ tone: "info", text: `Pico de demanda: ${DOW_NOMBRE[pico.dow]} ${pico.hora}h.` })
  const totalDemanda = demandaData.reduce((s, d) => s + d.value, 0)
  const nivelTop = [...demandaData].sort((a, b) => b.value - a.value)[0]
  if (nivelTop && totalDemanda > 0 && nivelTop.value > 0) {
    insights.push({ tone: "info", text: `Nivel ${nivelTop.label} concentra ${Math.round((nivelTop.value / totalDemanda) * 100)}% de la demanda.` })
  }
  if (data?.operativas?.clases_sin_instructora > 0) {
    insights.push({ tone: "warn", text: `${data.operativas.clases_sin_instructora} clases sin instructora asignada en el periodo.` })
  }
  if (overdueCount > 0 || soonCount > 0) {
    insights.push({ tone: overdueCount > 0 ? "warn" : "info", text: `${overdueCount} pagos vencidos · ${soonCount} por vencer.` })
  }

  const kpis = [
    { accent: "total", icon: Users, value: activeUsers, label: "Clientes activos", delta: clientsGrowthPct, sub: "vs. mes anterior", onClick: () => setActiveTab("clientes") },
    { accent: "horses", icon: CalendarDays, value: k?.reservas ?? "—", label: "Reservas del periodo", delta: k?.reservas_delta_pct ?? 0, sub: "vs. periodo anterior", onClick: () => setActiveTab("reservas") },
    { accent: "overdue", icon: XCircle, value: k ? `${k.cancelacion_pct}%` : "—", label: "Tasa de cancelación", delta: k?.cancelacion_delta_pts ?? 0, unit: " pts", goodWhenDown: true, sub: "vs. periodo anterior" },
    { accent: "soon", icon: UserCheck, value: k?.clientes_con_reserva ?? "—", label: "Clientes con reserva", delta: k?.clientes_con_reserva_delta_pct ?? 0, sub: "vs. periodo anterior" },
  ]

  return (
    <div className="tab-content tab-content-visible">
      {/* Bienvenida + selector de periodo */}
      <div ref={headerRef} className="home-welcome ia-header">
        <div className="home-welcome-text">
          <h2 className="home-welcome-title">¡Hola, {currentUser?.nombre || "Admin"}!</h2>
          <p className="home-welcome-sub">
            Análisis del club · {data ? `${ddmm(data.rango.desde)} → ${ddmm(data.rango.hasta)}` : "…"} (vs. periodo anterior)
          </p>
        </div>
        <div className="ia-seg">
          {[["semana", "Semana"], ["mes", "Mes"], ["rango", "Rango"]].map(([val, txt]) => (
            <button key={val} type="button" className={periodo === val ? "ia-seg-on" : ""} onClick={() => elegirPeriodo(val)}>{txt}</button>
          ))}
          {periodo === "rango" && (
            <span className="ia-rango">
              <input type="date" value={desde} onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))} />
              <input type="date" value={hasta} onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))} />
            </span>
          )}
        </div>
      </div>

      {/* KPIs analíticos */}
      <div className="home-top-row">
        {kpis.map((kpi) => {
          const KIcon = kpi.icon
          return (
            <button key={kpi.label} className={`kpi-card kpi-card-${kpi.accent}`} type="button" onClick={kpi.onClick || (() => {})}>
              <div className="kpi-icon"><KIcon size={22} /></div>
              <div className="kpi-body">
                <span className="kpi-number">{kpi.value}</span>
                <span className="kpi-label">{kpi.label}</span>
              </div>
              <Delta value={kpi.delta} unit={kpi.unit || "%"} goodWhenDown={kpi.goodWhenDown} sub={kpi.sub} />
            </button>
          )
        })}
      </div>

      {/* Demanda / actividad */}
      <h3 className="home-section-title"><LayoutGrid size={16} /> Actividad y demanda</h3>
      <div className="dc-grid-2">
        <div className="home-insight-card dc-card">
          <div className="home-insight-head">
            <span className="home-insight-icon"><TrendingUp size={18} /></span>
            <span className="home-insight-title">Tendencia de reservas</span>
          </div>
          <div className="home-insight-chart">
            {tendenciaData.length >= 2 ? <MiniArea color="#3b7a9c" data={tendenciaData} /> : <ChartEmpty loading={loading} />}
          </div>
          <p className="home-insight-caption">Reservas por día en el periodo</p>
        </div>

        <div className="home-insight-card dc-card">
          <div className="home-insight-head">
            <span className="home-insight-icon"><CalendarClock size={18} /></span>
            <span className="home-insight-title">Mapa de calor · día × hora</span>
          </div>
          <Heatmap data={data?.heatmap || []} />
          <p className="home-insight-caption">Cuándo se concentra la demanda</p>
        </div>
      </div>

      <div className="dc-grid-3">
        <div className="home-insight-card dc-card">
          <div className="home-insight-head">
            <span className="home-insight-icon"><CalendarDays size={18} /></span>
            <span className="home-insight-title">Reservas por horario</span>
          </div>
          <div className="home-insight-chart ia-hora-chart">
            {porHoraData.length > 0 ? <MiniBars color="#cdbfa9" data={porHoraData} unidad="reservas" /> : <ChartEmpty loading={loading} />}
          </div>
          <p className="home-insight-caption">{horaPico ? `Pico ${horaPico.label} (${horaPico.value} reservas)` : "Por hora del día"}</p>
        </div>

        <div className="home-insight-card dc-card">
          <div className="home-insight-head">
            <span className="home-insight-icon"><BarChart3 size={18} /></span>
            <span className="home-insight-title">Reservas por estatus</span>
          </div>
          <div className="home-insight-chart">
            {estatusSegments.some((s) => s.value > 0)
              ? (
                <div className="mini-chart-with-legend">
                  <MiniDonut centerValue={estatusSegments.reduce((s, x) => s + x.value, 0)} centerLabel="reservas" segments={estatusSegments} />
                  <ul className="mini-legend">
                    {estatusSegments.map((s) => (
                      <li key={s.label}><span className="mini-dot" style={{ background: s.color }} />{s.label}: {s.value}</li>
                    ))}
                  </ul>
                </div>
              )
              : <ChartEmpty loading={loading} />}
          </div>
          <p className="home-insight-caption">Distribución · resalta la cancelación</p>
        </div>

        <div className="home-insight-card dc-card">
          <div className="home-insight-head">
            <span className="home-insight-icon"><Users size={18} /></span>
            <span className="home-insight-title">Clientes</span>
          </div>
          <div className="home-insight-chart">
            <div className="mini-chart-with-legend">
              <MiniDonut centerValue={totalUsers} centerLabel="clientes" segments={[
                { label: "Activos", value: activeUsers, color: "#9caf88" },
                { label: "Bloqueados", value: blockedUsers, color: "#c17b4a" },
                { label: "Pendientes", value: pendingUsers, color: "#e0a458" },
              ]} />
              <ul className="mini-legend">
                <li><span className="mini-dot" style={{ background: "#9caf88" }} />Activos: {activeUsers}</li>
                <li><span className="mini-dot" style={{ background: "#c17b4a" }} />Bloqueados: {blockedUsers}</li>
                <li><span className="mini-dot" style={{ background: "#e0a458" }} />Pendientes: {pendingUsers}</li>
              </ul>
            </div>
          </div>
          <p className="home-insight-caption">Cartera · {clientsGrowthPct >= 0 ? "+" : ""}{clientsGrowthPct}% vs. mes anterior</p>
        </div>
      </div>

      {/* Servicio y capacidad */}
      <h3 className="home-section-title"><GraduationCap size={16} /> Servicio y capacidad</h3>
      <div className="dc-grid-2">
        <div className="home-insight-card dc-card">
          <div className="home-insight-head">
            <span className="home-insight-icon"><GraduationCap size={18} /></span>
            <span className="home-insight-title">Clases por instructora</span>
          </div>
          <div className="home-insight-chart">
            {instructorasData.some((d) => d.value > 0) ? <MiniHBars color="#c17b4a" data={instructorasData} /> : <ChartEmpty loading={loading} />}
          </div>
          <p className="home-insight-caption">Carga en el periodo</p>
        </div>

        <div className="home-insight-card dc-card">
          <div className="home-insight-head">
            <span className="home-insight-icon"><BarChart3 size={18} /></span>
            <span className="home-insight-title">Demanda por nivel</span>
          </div>
          <div className="home-insight-chart">
            {demandaData.some((d) => d.value > 0) ? <MiniHBars color="#3b7a9c" data={demandaData} /> : <ChartEmpty loading={loading} />}
          </div>
          <p className="home-insight-caption">Reservas por nivel de clase</p>
        </div>
      </div>

      {/* Caballos (titular + enlace) */}
      <button type="button" className="home-insight-card dc-card ia-cab" onClick={() => setActiveTab("metricascab")}>
        <div className="home-insight-head">
          <span className="home-insight-icon"><BarChart3 size={18} /></span>
          <span className="home-insight-title">Caballos</span>
          <ArrowRight size={16} className="home-insight-arrow" />
        </div>
        <p className="ia-cab-text">
          <strong>{data?.caballos?.disponibles ?? availableHorses}</strong> de <strong>{data?.caballos?.total ?? totalHorses}</strong> disponibles · ver dashboard de caballos
        </p>
      </button>

      {/* Insights y alertas */}
      <h3 className="home-section-title"><AlertTriangle size={16} /> Insights y alertas</h3>
      <div className="dc-alertas">
        <ul className="dc-alertas-list">
          {insights.length === 0
            ? <li className="dc-alerta dc-alerta-info">Sin datos suficientes en el periodo.</li>
            : insights.map((a, i) => <li key={i} className={`dc-alerta dc-alerta-${a.tone}`}>{a.text}</li>)}
        </ul>
      </div>
    </div>
  )
}
