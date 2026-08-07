// src/components/registro/TablaUsuarios.jsx
import React, { useCallback, useMemo, useState } from "react";
import { Search, User, X } from "lucide-react";
import { toast } from "react-toastify";
import UsuarioRow from "./UsuarioRow";
import ModalEliminarUsuario from "./ModalEliminarUsuario";
import { coincideBusqueda } from "./helpers";
import {
  actualizarCorreoUsuario,
  actualizarPasswordUsuario,
  cambiarEstatusUsuario,
} from "./registroApi";
import { MIN_PASSWORD, ROLES, TOAST_OPTS } from "./constants";

const TablaUsuarios = React.memo(({ usuarios, loading, onRecargar }) => {
  const [edits, setEdits] = useState({});
  const [passwordEdits, setPasswordEdits] = useState({});
  const [editandoPasswords, setEditandoPasswords] = useState({});
  const [passwordsVisibles, setPasswordsVisibles] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("");
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);

  // ===== Edición en línea =====
  const handleEmailChange = useCallback((id, value) => {
    setEdits((prev) => ({ ...prev, [id]: value }));
  }, []);

  const handlePasswordChange = useCallback((id, value) => {
    setPasswordEdits((prev) => ({ ...prev, [id]: value }));
  }, []);

  const togglePasswordVisible = useCallback((id) => {
    setPasswordsVisibles((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const iniciarEdicionPassword = useCallback((id, passwordActual) => {
    setEditandoPasswords((prev) => ({ ...prev, [id]: true }));
    setPasswordEdits((prev) => ({ ...prev, [id]: passwordActual }));
    setPasswordsVisibles((prev) => ({ ...prev, [id]: true }));
  }, []);

  const cancelarEdicionPassword = useCallback((id) => {
    setEditandoPasswords((prev) => ({ ...prev, [id]: false }));
    setPasswordEdits((prev) => ({ ...prev, [id]: "" }));
  }, []);

  const copiar = useCallback((texto, etiqueta) => {
    navigator.clipboard.writeText(texto);
    toast.success(`${etiqueta} copiado al portapapeles`, {
      ...TOAST_OPTS,
      autoClose: 2000,
    });
  }, []);

  // ===== Guardado =====
  const handleGuardar = useCallback(
    async (id) => {
      const usuario = usuarios.find((u) => u.id === id);
      const nuevoPassword = passwordEdits[id];
      const editandoPassword = Boolean(editandoPasswords[id]);
      const correoCambiado = Boolean(edits[id] && edits[id] !== usuario?.correo);

      let passwordGuardado = false;
      let correoGuardado = false;

      if (editandoPassword) {
        if (!nuevoPassword || nuevoPassword.length < MIN_PASSWORD) {
          toast.error(
            `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`,
            TOAST_OPTS
          );
          return;
        }
        passwordGuardado = await actualizarPasswordUsuario(id, nuevoPassword);
        if (!passwordGuardado) {
          toast.error("No se pudo actualizar la contraseña", TOAST_OPTS);
          return;
        }
        setEditandoPasswords((prev) => ({ ...prev, [id]: false }));
        setPasswordEdits((prev) => ({ ...prev, [id]: "" }));
      }

      if (correoCambiado) {
        correoGuardado = await actualizarCorreoUsuario(id, edits[id]);
        if (!correoGuardado) {
          toast.error("No se pudo actualizar el correo", TOAST_OPTS);
          return;
        }
      }

      if (passwordGuardado && correoGuardado) {
        toast.success("Correo y contraseña actualizados", TOAST_OPTS);
      } else if (passwordGuardado) {
        toast.success("Contraseña actualizada correctamente", TOAST_OPTS);
      } else if (correoGuardado) {
        toast.success("Correo actualizado correctamente", TOAST_OPTS);
      }

      setEdits((prev) => {
        const siguiente = { ...prev };
        delete siguiente[id];
        return siguiente;
      });

      // Recarga silenciosa: refresca los datos sin poner la tabla en "loading"
      // (antes esto bloqueaba todos los inputs de la vista tras cada guardado).
      if (onRecargar) await onRecargar();
    },
    [usuarios, passwordEdits, editandoPasswords, edits, onRecargar]
  );

  // ===== Eliminar / reactivar =====
  const abrirModalEliminar = useCallback((usuario) => {
    setUsuarioAEliminar(usuario);
  }, []);

  const cerrarModalEliminar = useCallback(() => setUsuarioAEliminar(null), []);

  const recargar = useCallback(async () => {
    if (onRecargar) await onRecargar();
  }, [onRecargar]);

  const handleReactivar = useCallback(
    async (usuario) => {
      const ok = await cambiarEstatusUsuario(usuario.id, "activo");
      if (!ok) {
        toast.error("No se pudo reactivar la cuenta", TOAST_OPTS);
        return;
      }
      toast.success(`Cuenta de ${usuario.nombre} reactivada`, TOAST_OPTS);
      await recargar();
    },
    [recargar]
  );

  // ===== Filtros =====
  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino && !filtroRol) return usuarios;
    return usuarios.filter((usuario) => {
      if (filtroRol && usuario.rol !== filtroRol) return false;
      return !termino || coincideBusqueda(usuario, termino);
    });
  }, [usuarios, busqueda, filtroRol]);

  const hayFiltros = Boolean(busqueda.trim() || filtroRol);

  return (
    <div className="user-table-section">
      <div className="section-header">
        <h3>
          <User size={22} /> Usuarios Registrados ({usuariosFiltrados.length}
          {hayFiltros ? ` de ${usuarios.length}` : ""})
        </h3>
        <p>Listado completo de usuarios en el sistema</p>
      </div>

      {/* Controles: mismo patrón visual que el panel de administración */}
      <div className="controls-container">
        <div className="filters-grid">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, correo, usuario, rol o ID..."
              autoComplete="off"
            />
            {busqueda && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setBusqueda("")}
                aria-label="Limpiar búsqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <select
            className="filter-select"
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
          >
            <option value="">Todos los roles</option>
            {ROLES.map((rol) => (
              <option key={rol.value} value={rol.value}>
                {rol.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {usuarios.length === 0 ? (
        <div className="empty-state">
          <User size={48} />
          <p>No hay usuarios registrados</p>
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="empty-state">
          <User size={48} />
          <p>No se encontraron usuarios con los filtros aplicados</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre Completo</th>
                <th>Email</th>
                <th>Credenciales</th>
                <th>Rol</th>
                <th>Nivel</th>
                <th>Fecha Registro</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((usuario) => {
                const editandoPassword = Boolean(editandoPasswords[usuario.id]);
                const passwordValue = passwordEdits[usuario.id];
                const passwordInvalida =
                  editandoPassword &&
                  (!passwordValue || passwordValue.length < MIN_PASSWORD);
                const correoCambiado = Boolean(
                  edits[usuario.id] && edits[usuario.id] !== usuario.correo
                );
                const passwordCambiado =
                  editandoPassword && !passwordInvalida;

                return (
                  <UsuarioRow
                    key={usuario.id}
                    usuario={usuario}
                    emailValue={edits[usuario.id]}
                    onEmailChange={handleEmailChange}
                    passwordVisible={passwordsVisibles[usuario.id]}
                    onTogglePassword={togglePasswordVisible}
                    editandoPassword={editandoPassword}
                    passwordValue={passwordValue}
                    onPasswordChange={handlePasswordChange}
                    onIniciarEdicion={iniciarEdicionPassword}
                    onCancelarEdicion={cancelarEdicionPassword}
                    onCopiar={copiar}
                    onGuardar={handleGuardar}
                    onEliminar={abrirModalEliminar}
                    onReactivar={handleReactivar}
                    loading={loading}
                    tieneCambios={correoCambiado || passwordCambiado}
                    passwordInvalida={passwordInvalida}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {usuarioAEliminar && (
        <ModalEliminarUsuario
          usuario={usuarioAEliminar}
          onCerrar={cerrarModalEliminar}
          onCompletado={recargar}
        />
      )}
    </div>
  );
});

TablaUsuarios.displayName = "TablaUsuarios";

export default TablaUsuarios;
