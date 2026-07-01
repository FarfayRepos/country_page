import { useEffect, useState } from "react";

// Apartado "Caballos" para los instructores: lista todos los caballos con su perfil
// (disponibilidad, renta/propietario, nivel) y un modal con observaciones y el
// conteo de salidas del día. Solo lectura. Consume /api/caballos y /:id/perfil.
const API_BASE_URL = "https://elrefugiocountryclub.com/api/api";

function estatusBadge(estatus) {
  const map = {
    publico: { label: "Público", color: "#3b7a9c" },
    privado: { label: "Privado", color: "#7d5ba6" },
    renta: { label: "Renta", color: "#b8860b" },
    media_renta: { label: "Media renta", color: "#cd853f" },
  };
  const it = map[estatus] || { label: estatus || "—", color: "#666" };
  return (
    <span style={{ background: it.color, color: "#fff", padding: "2px 8px", borderRadius: 12, fontSize: "0.72rem", fontWeight: 600 }}>
      {it.label}
    </span>
  );
}

export default function CaballosPerfil() {
  const [caballos, setCaballos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [perfilLoading, setPerfilLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState(null);

  // Gradiente del sistema (mismo del hero / pestañas / secciones)
  const GRAD = "linear-gradient(120deg, #6b4423 0%, #8b5a2b 55%, #c17b4a 100%)";
  // "avanzado,iniciacion,paseo" → "Avanzado · Iniciacion · Paseo" (con espacios para que envuelva)
  const formatNivel = (esp) =>
    (esp || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" · ") || "—";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/caballos`);
        if (!res.ok) throw new Error("No se pudieron cargar los caballos");
        setCaballos(await res.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const abrirPerfil = async (caballo) => {
    setPerfil({ ...caballo, salidas_dia: null });
    setPerfilLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/caballos/${caballo.id}/perfil`);
      if (res.ok) setPerfil(await res.json());
    } catch {
      /* mantiene los datos base si falla */
    } finally {
      setPerfilLoading(false);
    }
  };

  const filtrados = caballos.filter((c) =>
    (c.nombre || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <p style={{ padding: "1rem" }}>Cargando caballos…</p>;
  if (error) return <p style={{ padding: "1rem", color: "#c0392b" }}>{error}</p>;

  return (
    <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 8px 24px rgba(74,44,23,0.10)", border: "1px solid #efe7dc", overflow: "hidden" }}>
      {/* Cabecera degradada (misma identidad que hero / pestañas / tabla) */}
      <div style={{ background: GRAD, padding: "1.15rem 1.5rem", display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
        <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
          🐎
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h2 style={{ color: "#fff", margin: 0, fontSize: "1.375rem", fontWeight: 700, lineHeight: 1.1 }}>Caballos del club</h2>
          <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.82rem" }}>Perfil, nivel y disponibilidad</span>
        </div>
        <span style={{ marginLeft: "auto", background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", padding: "0.3rem 0.8rem", borderRadius: 9999, fontSize: "0.78rem", fontWeight: 700 }}>
          {search ? `${filtrados.length} de ${caballos.length}` : `${caballos.length} caballos`}
        </span>
      </div>

      {/* Cuerpo */}
      <div style={{ padding: "1.25rem 1.5rem" }}>
        <input
          type="text"
          placeholder="Buscar caballo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "0.6rem 0.9rem", borderRadius: 10, border: "1.5px solid #d4c4b0", marginBottom: "1.1rem", width: "min(340px, 100%)", fontSize: "0.9rem", fontFamily: "inherit", outline: "none" }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "1rem" }}>
          {filtrados.map((c) => {
            const disponible = c.disponibilidad === "disponible";
            const hov = hoveredId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => abrirPerfil(c)}
                onMouseEnter={() => setHoveredId(c.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: "#fff",
                  border: "1px solid #eadfd2",
                  borderLeft: `4px solid ${disponible ? "#9caf88" : "#c17b4a"}`,
                  borderRadius: 12,
                  padding: "0.95rem 1rem",
                  cursor: "pointer",
                  transition: "transform 0.16s ease, box-shadow 0.16s ease",
                  transform: hov ? "translateY(-3px)" : "none",
                  boxShadow: hov ? "0 8px 20px rgba(74,44,23,0.14)" : "0 1px 3px rgba(74,44,23,0.06)",
                  minWidth: 0,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <strong style={{ color: "#4a2f17", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nombre}</strong>
                  <span
                    title={disponible ? "Disponible" : "No disponible"}
                    style={{ width: 11, height: 11, borderRadius: "50%", background: disponible ? "#5a7245" : "#c17b4a", flexShrink: 0, boxShadow: `0 0 0 3px ${disponible ? "rgba(90,114,69,0.15)" : "rgba(193,123,74,0.15)"}` }}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>{estatusBadge(c.estatus)}</div>
                <div style={{ fontSize: "0.78rem", color: "#6b5c4a", overflowWrap: "anywhere", lineHeight: 1.4 }}>
                  <span style={{ color: "#a08a6f", fontWeight: 600 }}>Nivel:</span> {formatNivel(c.especialidad)}
                </div>
                {c.propietario_nombre && (
                  <div style={{ fontSize: "0.76rem", color: "#6b5c4a", overflowWrap: "anywhere", marginTop: 2 }}>
                    <span style={{ color: "#a08a6f", fontWeight: 600 }}>Propietario:</span> {c.propietario_nombre}
                  </div>
                )}
                {(c.estatus === "renta" || c.estatus === "media_renta") && c.renta_cliente_nombre && (
                  <div style={{ fontSize: "0.76rem", color: "#b8860b", overflowWrap: "anywhere", marginTop: 2 }}>Rentado a: {c.renta_cliente_nombre}</div>
                )}
              </div>
            );
          })}
        </div>

        {filtrados.length === 0 && (
          <p style={{ color: "#8a7c6a", fontSize: "0.9rem", padding: "0.5rem 0" }}>No se encontraron caballos.</p>
        )}
      </div>

      {perfil && (
        <div onClick={() => setPerfil(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", width: "min(460px, 92vw)" }}>
            <h2 style={{ marginTop: 0, color: "#6b4423" }}>{perfil.nombre}</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
              {estatusBadge(perfil.estatus)}
              <span style={{ fontSize: "0.82rem", color: perfil.disponibilidad === "disponible" ? "#2e7d32" : "#c0392b" }}>
                {perfil.disponibilidad === "disponible" ? "Disponible" : "No disponible"}
              </span>
            </div>
            <p style={{ margin: "4px 0", fontSize: "0.88rem" }}><strong>Salidas hoy:</strong> {perfilLoading ? "…" : (perfil.salidas_dia ?? "—")}
              {perfil.salidas_dia > 2 && <span style={{ color: "#c0392b", fontWeight: 600 }}> ⚠ Ya salió más de 2 veces</span>}
            </p>
            <p style={{ margin: "4px 0", fontSize: "0.88rem" }}><strong>Nivel:</strong> {formatNivel(perfil.especialidad)}</p>
            {perfil.propietario_nombre && <p style={{ margin: "4px 0", fontSize: "0.88rem" }}><strong>Propietario:</strong> {perfil.propietario_nombre}</p>}
            {(perfil.estatus === "renta" || perfil.estatus === "media_renta") && (
              <p style={{ margin: "4px 0", fontSize: "0.88rem", color: "#b8860b" }}>
                <strong>En renta:</strong> {perfil.renta_cliente_nombre || perfil.renta_con || "—"}
              </p>
            )}
            <div style={{ marginTop: 10 }}>
              <strong style={{ fontSize: "0.88rem" }}>Observaciones:</strong>
              <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#555", whiteSpace: "pre-wrap" }}>
                {perfil.descripcion || "Sin observaciones."}
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <button onClick={() => setPerfil(null)} style={{ padding: "0.5rem 1rem", background: "#9caf88", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
