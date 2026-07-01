import { useState, useRef } from "react"

/* =============================================================
   MINI-GRÁFICAS INTERACTIVAS (compartidas)
   SVG / CSS ligero, sin librerías externas. Tooltips al pasar el
   cursor + animación de entrada. Estilos en CSS/Contabilidad.css.
   Usadas por el panel de inicio y el dashboard de caballos.
   ============================================================= */

// Tooltip flotante (posicionado dentro del contenedor de la gráfica)
export const ChartTooltip = ({ tip }) => (
  <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
    <span className="chart-tip-label">{tip.label}</span>
    <span className="chart-tip-value">{tip.value}</span>
  </div>
)

// Donut de distribución
export const MiniDonut = ({ segments, centerValue, centerLabel }) => {
  const total = segments.reduce((s, d) => s + d.value, 0) || 1
  const radius = 44
  const stroke = 16
  const circ = 2 * Math.PI * radius
  const ref = useRef(null)
  const [tip, setTip] = useState(null)
  const show = (e, s) => {
    const rect = ref.current.getBoundingClientRect()
    setTip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      label: s.label,
      value: `${s.value} (${Math.round((s.value / total) * 100)}%)`,
    })
  }
  let offset = 0
  return (
    <div className="mini-donut-wrap" ref={ref} onMouseLeave={() => setTip(null)}>
      <svg viewBox="0 0 120 120" className="mini-chart-donut" role="img">
        <g transform="rotate(-90 60 60)">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#efe7dc" strokeWidth={stroke} />
          {segments.map((s, i) => {
            const len = (s.value / total) * circ
            const el = (
              <circle
                key={i}
                className="donut-seg"
                cx="60" cy="60" r={radius}
                fill="none" stroke={s.color} strokeWidth={stroke}
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-offset}
                onMouseEnter={(e) => show(e, s)}
                onMouseMove={(e) => show(e, s)}
              />
            )
            offset += len
            return el
          })}
        </g>
        <text x="60" y="57" textAnchor="middle" className="mini-donut-num">{centerValue ?? total}</text>
        <text x="60" y="75" textAnchor="middle" className="mini-donut-cap">{centerLabel ?? "total"}</text>
      </svg>
      {tip && <ChartTooltip tip={tip} />}
    </div>
  )
}

// Anillo de ocupación / gauge
export const MiniGauge = ({ value, color, disponibles, total }) => {
  const radius = 44
  const stroke = 16
  const circ = 2 * Math.PI * radius
  const len = (Math.min(Math.max(value, 0), 100) / 100) * circ
  const ref = useRef(null)
  const [tip, setTip] = useState(null)
  const show = (e) => {
    const rect = ref.current.getBoundingClientRect()
    setTip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      label: "Disponibles",
      value: `${disponibles} de ${total}`,
    })
  }
  return (
    <div className="mini-donut-wrap" ref={ref} onMouseLeave={() => setTip(null)}>
      <svg viewBox="0 0 120 120" className="mini-chart-donut" role="img">
        <g transform="rotate(-90 60 60)">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#efe7dc" strokeWidth={stroke} />
          <circle
            className="donut-seg"
            cx="60" cy="60" r={radius}
            fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${len} ${circ - len}`}
            onMouseEnter={show}
            onMouseMove={show}
          />
        </g>
        <text x="60" y="57" textAnchor="middle" className="mini-donut-num">{value}%</text>
        <text x="60" y="75" textAnchor="middle" className="mini-donut-cap">disp.</text>
      </svg>
      {tip && <ChartTooltip tip={tip} />}
    </div>
  )
}

// Barras verticales. `unidad` opcional añade contexto al tooltip (ej. "reservas").
export const MiniBars = ({ data, color, unidad }) => {
  const max = Math.max(...data.map(d => d.value), 1)
  const ref = useRef(null)
  const [tip, setTip] = useState(null)
  const show = (e, d) => {
    const rect = ref.current.getBoundingClientRect()
    setTip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      label: d.tipLabel || d.label,
      value: unidad ? `${d.value} ${unidad}` : d.value,
    })
  }
  return (
    <div className="mini-bars" ref={ref} onMouseLeave={() => setTip(null)}>
      {data.map((d, i) => (
        <div
          className="mini-bar-col"
          key={i}
          onMouseEnter={(e) => show(e, d)}
          onMouseMove={(e) => show(e, d)}
        >
          <div className="mini-bar-track">
            <div
              className="mini-bar-fill"
              style={{ height: `${Math.max((d.value / max) * 100, 4)}%`, background: d.color || color, animationDelay: `${i * 55}ms` }}
            />
          </div>
          <span className="mini-bar-label">{d.label}</span>
        </div>
      ))}
      {tip && <ChartTooltip tip={tip} />}
    </div>
  )
}

// Barras horizontales tipo ranking
export const MiniHBars = ({ data, color }) => {
  const max = Math.max(...data.map(d => d.value), 1)
  const ref = useRef(null)
  const [tip, setTip] = useState(null)
  const show = (e, d) => {
    const rect = ref.current.getBoundingClientRect()
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, label: d.label, value: d.value })
  }
  return (
    <div className="mini-hbars" ref={ref} onMouseLeave={() => setTip(null)}>
      {data.map((d, i) => (
        <div
          className="mini-hbar-row"
          key={i}
          onMouseEnter={(e) => show(e, d)}
          onMouseMove={(e) => show(e, d)}
        >
          <span className="mini-hbar-label">{d.label}</span>
          <div className="mini-hbar-track">
            <div
              className="mini-hbar-fill"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color || color, animationDelay: `${i * 55}ms` }}
            />
          </div>
          <span className="mini-hbar-val">{d.value}</span>
        </div>
      ))}
      {tip && <ChartTooltip tip={tip} />}
    </div>
  )
}

// Área de tendencia
export const MiniArea = ({ data, color }) => {
  const w = 200, h = 70, pad = 8
  const values = data.map(d => d.value)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const ref = useRef(null)
  const [tip, setTip] = useState(null)
  const pts = data.map((d, i) => {
    const x = pad + (i * (w - 2 * pad)) / (data.length - 1 || 1)
    const y = h - pad - ((d.value - min) / (max - min || 1)) * (h - 2 * pad)
    return { x, y, d }
  })
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${h} L${pts[0].x.toFixed(1)},${h} Z`
  const gid = `miniArea-${color.replace("#", "")}`
  const show = (e, p) => {
    const rect = ref.current.getBoundingClientRect()
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, label: p.d.label, value: p.d.value })
  }
  return (
    <div className="mini-area-wrap" ref={ref} onMouseLeave={() => setTip(null)}>
      <svg viewBox={`0 0 ${w} ${h}`} className="mini-chart-area" preserveAspectRatio="none" role="img">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} className="area-fill" />
        <path
          d={line}
          className="area-line"
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          vectorEffect="non-scaling-stroke"
        />
        {pts.map((p, i) => (
          <circle
            key={i}
            className="area-pt"
            cx={p.x} cy={p.y} r="6"
            fill="transparent"
            onMouseEnter={(e) => show(e, p)}
            onMouseMove={(e) => show(e, p)}
          />
        ))}
        {pts.map((p, i) => (
          <circle key={`d${i}`} cx={p.x} cy={p.y} r="2.6" fill={color} className="area-dot" />
        ))}
      </svg>
      {tip && <ChartTooltip tip={tip} />}
    </div>
  )
}

// Estado vacío / cargando para una gráfica
export const ChartEmpty = ({ loading }) => (
  <div className="chart-empty">{loading ? "Cargando…" : "Sin datos"}</div>
)

// Mapa de calor de actividad por día de la semana × hora.
// data: [{ dow (1=Dom..7=Sáb), hora, total }]. Estilos en CSS/DashboardCaballos.css.
const DOW_ORDER = [2, 3, 4, 5, 6, 7, 1]
const DOW_LABEL = { 1: "D", 2: "L", 3: "M", 4: "MI", 5: "J", 6: "V", 7: "S" }
const HEAT_STOPS = [
  { t: 0, c: [225, 238, 217] },   // verde muy claro
  { t: 0.5, c: [224, 164, 88] },  // ámbar
  { t: 1, c: [179, 96, 58] },     // terracota (pico)
]
function heatColor(t) {
  let a = HEAT_STOPS[0], b = HEAT_STOPS[HEAT_STOPS.length - 1]
  for (let i = 0; i < HEAT_STOPS.length - 1; i++) {
    if (t >= HEAT_STOPS[i].t && t <= HEAT_STOPS[i + 1].t) { a = HEAT_STOPS[i]; b = HEAT_STOPS[i + 1]; break }
  }
  const k = (t - a.t) / ((b.t - a.t) || 1)
  const ch = (i) => Math.round(a.c[i] + (b.c[i] - a.c[i]) * k)
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`
}
export const Heatmap = ({ data }) => {
  if (!data.length) return <ChartEmpty loading={false} />
  const horas = [...new Set(data.map(d => d.hora))].sort((a, b) => a - b)
  const max = Math.max(...data.map(d => d.total), 1)
  const lookup = new Map(data.map(d => [`${d.dow}-${d.hora}`, d.total]))
  return (
    <div className="dc-heatmap">
      <div className="dc-heat-row">
        <span className="dc-heat-hlabel" />
        {DOW_ORDER.map(dow => <span key={dow} className="dc-heat-dlabel">{DOW_LABEL[dow]}</span>)}
      </div>
      {horas.map(h => (
        <div key={h} className="dc-heat-row">
          <span className="dc-heat-hlabel">{String(h).padStart(2, "0")}h</span>
          {DOW_ORDER.map(dow => {
            const v = lookup.get(`${dow}-${h}`) || 0
            const t = v / max
            return (
              <span
                key={dow}
                className="dc-heat-cell"
                title={`${DOW_LABEL[dow]} ${h}h: ${v}`}
                style={{ background: v ? heatColor(t) : "#f3ede4", color: t > 0.55 ? "#fff" : "#7a6c5a" }}
              >
                {v || ""}
              </span>
            )
          })}
        </div>
      ))}
      <div className="dc-heat-legend">
        <span>Menos</span>
        <i className="dc-heat-ramp" />
        <span>Más</span>
      </div>
    </div>
  )
}
