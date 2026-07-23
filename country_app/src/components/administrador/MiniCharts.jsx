import { useState, useRef, useEffect, useLayoutEffect } from "react"

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

// Mide el ancho real del contenedor para dibujar el SVG 1:1 (sin deformar).
const useAnchoContenedor = (ref) => {
  const [ancho, setAncho] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setAncho(el.clientWidth)
  }, [ref])
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(([entry]) => setAncho(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return ancho
}

// Escala "bonita" con base en 0 y un punto medio entero (0 · max/2 · max).
const escalaY = (maxValor) => {
  const objetivo = Math.max(maxValor, 1) / 2
  const mag = Math.pow(10, Math.floor(Math.log10(objetivo)))
  const n = objetivo / mag
  const paso = Math.max(1, (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag)
  return { paso, max: paso * 2 }
}

// Área de tendencia. Se dibuja a escala real (viewBox = px del contenedor) para
// que la línea, los puntos y el texto nunca se estiren al cambiar el ancho.
export const MiniArea = ({ data, color, unidad }) => {
  const ref = useRef(null)
  const ancho = useAnchoContenedor(ref)
  const [activo, setActivo] = useState(null)

  const H = 132, padL = 30, padR = 12, padT = 14, padB = 22
  const w = Math.max(ancho, 180)
  const plotW = w - padL - padR
  const plotH = H - padT - padB
  const { paso, max } = escalaY(Math.max(...data.map(d => d.value), 1))
  const x = (i) => padL + (i * plotW) / (data.length - 1 || 1)
  const y = (v) => padT + plotH - (v / max) * plotH
  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value), d }))

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
  const base = padT + plotH
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`
  const gid = `miniArea-${color.replace("#", "")}`

  // Un punto cada N para no amontonar marcas ni etiquetas cuando hay muchos días.
  const saltoPuntos = Math.ceil(data.length / 24)
  const corto = (d) => d.shortLabel || d.label

  // Etiquetas del eje X repartidas de forma pareja según el ancho disponible.
  // Se reservan ~64px por etiqueta e incluye siempre el primer y último día,
  // descartando cualquiera que quede demasiado pegada a otra ya dibujada.
  const ultimo = data.length - 1
  const maxLabels = Math.max(2, Math.min(data.length, Math.floor(plotW / 64) + 1))
  const idxLabels = []
  if (data.length === 1) {
    idxLabels.push(0)
  } else {
    for (let k = 0; k < maxLabels; k++) idxLabels.push(Math.round((k * ultimo) / (maxLabels - 1)))
  }
  const minGap = 52 // px mínimos entre etiquetas para que no se amontonen
  const labelIdx = [...new Set(idxLabels)]
    .sort((a, b) => a - b)
    .filter((i, n, arr) => n === 0 || x(i) - x(arr[n - 1]) >= minGap || i === ultimo)
    // Si el último quedó pegado al anterior, se elimina el anterior (no el último).
    .filter((i, n, arr) => !(arr[n + 1] === ultimo && x(ultimo) - x(i) < minGap))

  // Sigue el cursor sobre toda el área: elige el punto más cercano.
  const seguir = (e) => {
    const rect = ref.current.getBoundingClientRect()
    const rel = ((e.clientX - rect.left) - padL) / (plotW || 1)
    const i = Math.min(data.length - 1, Math.max(0, Math.round(rel * (data.length - 1))))
    setActivo(i)
  }

  const sel = activo != null ? pts[activo] : null
  const tip = sel && {
    x: Math.min(Math.max(sel.x, 48), w - 48),
    y: sel.y,
    label: sel.d.label,
    value: unidad ? `${sel.d.value} ${unidad}` : sel.d.value,
  }

  return (
    <div className="mini-area-wrap" ref={ref} onMouseLeave={() => setActivo(null)}>
      <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} className="mini-chart-area" role="img">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.26" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Rejilla + escala vertical */}
        {[0, paso, max].map((v) => (
          <g key={v}>
            <line className="area-grid" x1={padL} x2={w - padR} y1={y(v)} y2={y(v)} />
            <text className="area-axis" x={padL - 7} y={y(v) + 3.5} textAnchor="end">{v}</text>
          </g>
        ))}

        <path d={area} fill={`url(#${gid})`} className="area-fill" />
        <path
          d={line}
          className="area-line"
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
        />

        {pts.map((p, i) => (
          i % saltoPuntos === 0 || i === pts.length - 1
            ? <circle key={`d${i}`} cx={p.x} cy={p.y} r="2.6" fill="#fff" stroke={color} strokeWidth="1.8" className="area-dot" />
            : null
        ))}

        {/* Etiquetas del eje X */}
        {labelIdx.map((i) => (
          <text key={`x${i}`} className="area-axis" x={pts[i].x} y={H - 6} textAnchor={i === 0 ? "start" : i === ultimo ? "end" : "middle"}>{corto(pts[i].d)}</text>
        ))}

        {/* Punto activo */}
        {sel && (
          <g className="area-hover">
            <line className="area-cross" x1={sel.x} x2={sel.x} y1={padT} y2={base} stroke={color} />
            <circle cx={sel.x} cy={sel.y} r="4.5" fill={color} stroke="#fff" strokeWidth="2" />
          </g>
        )}

        {/* Capa de captura del cursor */}
        <rect
          x={padL - 6} y={padT} width={plotW + 12} height={plotH}
          fill="transparent"
          onMouseMove={seguir}
          onMouseEnter={seguir}
        />
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
