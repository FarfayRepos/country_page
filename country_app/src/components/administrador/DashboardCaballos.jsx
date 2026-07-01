import { useEffect, useState, useCallback } from "react"
import "../../CSS/Contabilidad.css"
import "../../CSS/DashboardCaballos.css"
import { PawPrint, CheckCircle, Activity, AlertTriangle, Database, BarChart3, Crown, TrendingUp, CalendarClock } from "lucide-react"
import { MiniDonut, MiniHBars, MiniArea, ChartEmpty, Heatmap } from "./MiniCharts"

// Dashboard avanzado de métricas de caballos (Fase 1). Consume
// GET /api/metricas/caballos-avanzado y reutiliza el lenguaje visual del
// panel de inicio (KPIs + tarjetas con mini-gráficas).
// En desarrollo apunta al backend local; en producción al dominio.
const IS_LOCAL =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
const API = IS_LOCAL
  ? "http://localhost:3001/api/metricas/caballos-avanzado"
  : "https://elrefugiocountryclub.com/api/api/metricas/caballos-avanzado"

const pct = (n, total) => (total > 0 ? Math.round(((n || 0) / total) * 100) : 0)

// Paleta de categorías para dar color variado a las gráficas.
const PALETTE = ["#3b7a9c", "#9caf88", "#e0a458", "#c17b4a", "#7d5ba6", "#5a9b8e", "#b8860b", "#6b4423"]
// Colores por tramo de uso (de "sin uso" a "muy usado").
const USO_COLORS = { "0": "#c17b4a", "1-2": "#e0a458", "3-5": "#9caf88", "6+": "#3b7a9c" }

// Reparte las salidas por caballo en tramos para el histograma de uso.
function bucketsDeUso(carga, inactivos) {
  const b = { "0": inactivos, "1-2": 0, "3-5": 0, "6+": 0 }
  for (const c of carga) {
    if (c.salidas >= 6) b["6+"]++
    else if (c.salidas >= 3) b["3-5"]++
    else b["1-2"]++
  }
  return Object.entries(b).map(([label, value]) => ({ label, value }))
}

// Etiqueta corta dd/mm para la semana de la serie temporal.
const ddmm = (s) => {
  const d = new Date(s)
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

// Construye alertas accionables. En modo instructor se omiten las de
// gestión global (cobertura, capital ocioso, comercial) y se enfoca en su uso.
function construirAlertas({ conteos, uso, oferta_demanda }, isInstructor) {
  const alertas = []
  const total = conteos.total || 0

  if (isInstructor) {
    alertas.push({
      tone: "info",
      text: `Usaste ${uso.activos} caballo${uso.activos !== 1 ? "s" : ""} distinto${uso.activos !== 1 ? "s" : ""} de ${total} en el periodo.`,
    })
  }
  if (!isInstructor && uso.cobertura_pct < 60) {
    alertas.push({
      tone: "warn",
      text: `Solo ${uso.cobertura_pct}% de las reservas tienen caballo asignado (${uso.reservas_con_caballo} de ${uso.reservas_total}) → las métricas de uso no son confiables.`,
    })
  }
  if (!isInstructor && uso.inactivos > 0) {
    alertas.push({
      tone: "warn",
      text: `${uso.inactivos} caballos sin clases registradas en el periodo → revisar asignación, salud o baja.`,
    })
  }
  if (!isInstructor) {
    const cuello = [...oferta_demanda].filter(o => o.ratio != null).sort((a, b) => b.ratio - a.ratio)[0]
    if (cuello && cuello.ratio >= 10) {
      alertas.push({
        tone: "warn",
        text: `Nivel ${cuello.nivel}: ${cuello.demanda} reservas / ${cuello.aptos} aptos (${cuello.ratio}× por caballo) → riesgo de sobrecarga.`,
      })
    }
  }
  const dispPct = pct(conteos.disponibles, total)
  alertas.push({
    tone: dispPct >= 50 ? "ok" : "warn",
    text: `Disponibilidad ${dispPct >= 80 ? "excelente" : dispPct >= 50 ? "buena" : "baja"} (${dispPct}%).`,
  })
  if (!isInstructor && (conteos.en_renta || 0) + (conteos.media_renta || 0) === 0) {
    alertas.push({ tone: "info", text: "0 caballos en renta → sección comercial sin datos / oportunidad." })
  }
  return alertas
}

// Fila de Oferta vs Demanda: barra de demanda + aptos + badge de ratio.
function FilaOfertaDemanda({ o, max, color }) {
  const sev = o.ratio == null ? "" : o.ratio >= 15 ? "dc-ratio-alto" : o.ratio >= 8 ? "dc-ratio-medio" : "dc-ratio-bajo"
  return (
    <div className="dc-od-row">
      <div className="dc-od-top">
        <span className="dc-od-nivel">{o.nivel}</span>
        {o.ratio != null && <span className={`dc-ratio ${sev}`}>{o.ratio}× / caballo</span>}
      </div>
      <div className="dc-od-bar">
        <div className="dc-od-fill" style={{ width: `${pct(o.demanda, max)}%`, background: color }} />
      </div>
      <span className="dc-od-meta">{o.demanda} reservas · {o.aptos} caballos aptos</span>
    </div>
  )
}

export default function DashboardCaballos({ scope = "admin", instructoraId = null }) {
  const isInstructor = scope === "instructor"
  const [data, setData] = useState(null)
  const [estado, setEstado] = useState("loading") // loading | ready | error
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")

  const cargar = useCallback(() => {
    setEstado("loading")
    const params = new URLSearchParams()
    if (desde) params.append("desde", desde)
    if (hasta) params.append("hasta", hasta)
    if (isInstructor && instructoraId) params.append("instructora_id", instructoraId)
    fetch(`${API}?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => { setData(d); setEstado("ready") })
      .catch(() => setEstado("error"))
  }, [desde, hasta, isInstructor, instructoraId])

  useEffect(() => { cargar() }, [cargar])

  if (estado === "loading" && !data) return <div className="chart-empty">Cargando métricas de caballos…</div>
  if (estado === "error") return <div className="chart-empty">No se pudieron cargar las métricas.</div>

  const { conteos: c, uso, oferta_demanda } = data
  const total = c.total || 0
  const usoBuckets = bucketsDeUso(uso.carga, uso.inactivos).map(b => ({ ...b, color: USO_COLORS[b.label] }))
  const demandaMax = Math.max(...oferta_demanda.map(o => o.demanda), 1)
  const tendenciaData = (data.tendencia || []).map(t => ({ label: ddmm(t.semana), value: t.total }))
  const cargaData = uso.carga.map((c, i) => ({ label: c.nombre, value: c.salidas, color: PALETTE[i % PALETTE.length] }))
  const alertas = construirAlertas(data, isInstructor)
  // Mensaje cuando no hay reservas con caballo asignado (causa del gráfico vacío).
  const sinCaballoMsg = isInstructor
    ? "Aún no se registra el caballo en tus clases"
    : "Aún no se registra el caballo en las reservas"

  const kpis = [
    { accent: "total", icon: PawPrint, value: total, label: "Plantel total" },
    { accent: "horses", icon: CheckCircle, value: `${c.disponibles || 0}`, label: `Disponibles (${pct(c.disponibles, total)}%)` },
    { accent: "soon", icon: Activity, value: uso.activos, label: isInstructor ? "Caballos que usas" : "Activos (con uso)" },
    { accent: "overdue", icon: AlertTriangle, value: uso.inactivos, label: isInstructor ? "Sin usar por ti" : "Inactivos (sin uso)" },
    // La cobertura de datos es una métrica de gestión: solo para el admin.
    ...(!isInstructor ? [{ accent: "total", icon: Database, value: `${uso.cobertura_pct}%`, label: "Cobertura de datos" }] : []),
  ]

  const fmtFecha = (s) => (s ? new Date(s).toISOString().slice(0, 10) : "")

  return (
    <div className="tab-content tab-content-visible">
      {/* Encabezado + filtro de fechas */}
      <div className="home-welcome dc-header-row">
        <div className="home-welcome-text">
          <h2 className="home-welcome-title">Métricas de Caballos</h2>
          <p className="home-welcome-sub">
            {isInstructor ? "Tus clases" : `Plantel de ${total} caballos`} · periodo {fmtFecha(data.rango.desde)} → {fmtFecha(data.rango.hasta)}
          </p>
        </div>
        <div className="dc-filtros">
          <label>Desde<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} /></label>
          <label>Hasta<input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} /></label>
          <button type="button" onClick={cargar}>Aplicar</button>
          {(desde || hasta) && (
            <button type="button" className="dc-link" onClick={() => { setDesde(""); setHasta("") }}>Limpiar</button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="dc-kpi-strip">
        {kpis.map((k, i) => {
          const KIcon = k.icon
          return (
            <div key={i} className={`kpi-card kpi-card-${k.accent}`}>
              <div className="kpi-icon"><KIcon size={22} /></div>
              <div className="kpi-body">
                <span className="kpi-number">{k.value}</span>
                <span className="kpi-label">{k.label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Demanda y capacidad */}
      <div className="dc-grid-2">
        <div className="home-insight-card dc-card">
          <div className="home-insight-head">
            <span className="home-insight-icon"><BarChart3 size={18} /></span>
            <span className="home-insight-title">{isInstructor ? "Demanda de tus clases por nivel" : "Oferta vs. demanda por nivel"}</span>
          </div>
          <div className="dc-od-list">
            {oferta_demanda.map((o, i) => <FilaOfertaDemanda key={o.nivel} o={o} max={demandaMax} color={PALETTE[i % PALETTE.length]} />)}
          </div>
          <p className="home-insight-caption">{isInstructor ? "Barra = tus reservas del periodo · aptos = caballos del club" : "Barra = reservas del periodo · ratio = reservas por caballo apto"}</p>
        </div>

        <div className="home-insight-card dc-card">
          <div className="home-insight-head">
            <span className="home-insight-icon"><Activity size={18} /></span>
            <span className="home-insight-title">Distribución de uso</span>
          </div>
          <div className="home-insight-chart">
            {uso.reservas_con_caballo > 0
              ? <MiniHBars color="#9caf88" data={usoBuckets} />
              : <div className="chart-empty dc-empty-msg">{sinCaballoMsg}</div>}
          </div>
          <p className="home-insight-caption">{isInstructor ? "Caballos por nº de salidas en tus clases" : "Caballos por número de salidas en el periodo"}</p>
        </div>
      </div>

      {/* Tendencia y picos de actividad */}
      <div className="dc-grid-2">
        <div className="home-insight-card dc-card">
          <div className="home-insight-head">
            <span className="home-insight-icon"><TrendingUp size={18} /></span>
            <span className="home-insight-title">Tendencia de actividad</span>
          </div>
          <div className="home-insight-chart">
            {tendenciaData.length >= 2
              ? <MiniArea color="#3b7a9c" data={tendenciaData} />
              : <ChartEmpty loading={false} />}
          </div>
          <p className="home-insight-caption">{isInstructor ? "Tus reservas por semana" : "Reservas por semana en el periodo"}</p>
        </div>

        <div className="home-insight-card dc-card">
          <div className="home-insight-head">
            <span className="home-insight-icon"><CalendarClock size={18} /></span>
            <span className="home-insight-title">Mapa de calor · día × hora</span>
          </div>
          <Heatmap data={data.heatmap || []} />
          <p className="home-insight-caption">Picos de demanda → programar descansos y rotación</p>
        </div>
      </div>

      {/* Carga por caballo */}
      <div className="home-insight-card dc-card dc-inactivos-card">
        <div className="home-insight-head">
          <span className="home-insight-icon"><BarChart3 size={18} /></span>
          <span className="home-insight-title">{isInstructor ? "Caballos que usas (salidas en el periodo)" : "Carga por caballo (salidas en el periodo)"}</span>
        </div>
        <div className="home-insight-chart">
          {cargaData.length > 0
            ? <MiniHBars color="#c17b4a" data={cargaData} />
            : <div className="chart-empty dc-empty-msg">{sinCaballoMsg}</div>}
        </div>
        <p className="home-insight-caption">
          {uso.cobertura_pct < 60
            ? `Atención: solo ${uso.cobertura_pct}% de reservas tienen caballo asignado — la carga real es mayor a la mostrada.`
            : "Salidas confirmadas/completadas por caballo."}
        </p>
      </div>

      {/* Estado del plantel (Composición solo para admin) */}
      <div className={isInstructor ? "dc-block" : "dc-grid-2"}>
        <div className="home-insight-card dc-card">
          <div className="home-insight-head">
            <span className="home-insight-icon"><CheckCircle size={18} /></span>
            <span className="home-insight-title">Estado del establo</span>
          </div>
          <div className="home-insight-chart">
            <div className="mini-chart-with-legend">
              <MiniDonut centerValue={total} centerLabel="caballos" segments={[
                { label: "Disponible", value: c.disponibles || 0, color: "#9caf88" },
                { label: "No disponible", value: c.no_disponibles || 0, color: "#c17b4a" },
              ]} />
              <ul className="mini-legend">
                <li><span className="mini-dot" style={{ background: "#9caf88" }} />Disponible: {c.disponibles || 0}</li>
                <li><span className="mini-dot" style={{ background: "#c17b4a" }} />No disponible: {c.no_disponibles || 0}</li>
              </ul>
            </div>
          </div>
        </div>

        {!isInstructor && (
          <div className="home-insight-card dc-card">
            <div className="home-insight-head">
              <span className="home-insight-icon"><Crown size={18} /></span>
              <span className="home-insight-title">Composición del plantel</span>
            </div>
            <div className="home-insight-chart">
              <div className="mini-chart-with-legend">
                <MiniDonut centerValue={total} centerLabel="caballos" segments={[
                  { label: "Club", value: total - (c.con_propietario || 0), color: "#6b4423" },
                  { label: "Pensión", value: c.con_propietario || 0, color: "#e0a458" },
                ]} />
                <ul className="mini-legend">
                  <li><span className="mini-dot" style={{ background: "#6b4423" }} />Club: {total - (c.con_propietario || 0)}</li>
                  <li><span className="mini-dot" style={{ background: "#e0a458" }} />Pensión: {c.con_propietario || 0}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Caballos reservados vs. sin reservar */}
      <div className="home-insight-card dc-card dc-inactivos-card">
        <div className="home-insight-head">
          <span className="home-insight-icon"><PawPrint size={18} /></span>
          <span className="home-insight-title">{isInstructor ? "Caballos que usas vs. que no" : "Caballos reservados vs. sin reservar"}</span>
        </div>
        <div className="dc-split">
          <div className="dc-split-col">
            <h4 className="dc-split-title">{isInstructor ? "Que usas" : "Reservados"} ({uso.carga.length})</h4>
            {uso.carga.length === 0
              ? <p className="home-insight-caption">{isInstructor ? "No has usado caballos en el periodo." : "Ninguno con reserva asignada en el periodo."}</p>
              : (
                <div className="dc-chips">
                  {uso.carga.map((h) => (
                    <span key={h.id} className="dc-chip dc-chip-on">{h.nombre} · {h.salidas}</span>
                  ))}
                </div>
              )}
          </div>
          <div className="dc-split-col">
            <h4 className="dc-split-title">{isInstructor ? "Que no usas" : "Sin reservar"} ({uso.inactivos})</h4>
            {uso.inactivos_lista.length === 0
              ? <p className="home-insight-caption">{isInstructor ? "Usaste todos los caballos." : "Todos tienen reserva asignada."}</p>
              : (
                <div className="dc-chips">
                  {uso.inactivos_lista.map((h) => (
                    <span key={h.id} className={`dc-chip ${h.disponibilidad === "no_disponible" ? "dc-chip-off" : ""}`}>
                      {h.nombre}
                    </span>
                  ))}
                </div>
              )}
          </div>
        </div>
        <p className="home-insight-caption">{isInstructor ? "«Que usas» = con clase tuya asignada en el periodo · el número es la cantidad de salidas" : "Reservados = con reserva asignada en el periodo · el número es la cantidad de salidas"}</p>
      </div>

      {/* Alertas y recomendaciones */}
      <h3 className="home-section-title"><AlertTriangle size={16} /> Alertas y recomendaciones</h3>
      <div className="dc-alertas">
        <ul className="dc-alertas-list">
          {alertas.map((a, i) => (
            <li key={i} className={`dc-alerta dc-alerta-${a.tone}`}>{a.text}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
