// src/components/registro/UsuarioRow.jsx
import React from "react";
import { Copy, Edit, Eye, EyeOff, RotateCcw, Save, Trash2, X } from "lucide-react";
import { formatearFechaRegistro, formatearNivel } from "./helpers";
import { MIN_PASSWORD } from "./constants";

/**
 * Fila de la tabla de usuarios. Recibe solo primitivas y callbacks estables
 * para que React.memo realmente evite re-renders: antes se le pasaba un objeto
 * `usuario` reconstruido en cada render y el memo nunca acertaba.
 */
const UsuarioRow = React.memo(
  ({
    usuario,
    emailValue,
    onEmailChange,
    passwordVisible,
    onTogglePassword,
    editandoPassword,
    passwordValue,
    onPasswordChange,
    onIniciarEdicion,
    onCancelarEdicion,
    onCopiar,
    onGuardar,
    onEliminar,
    onReactivar,
    loading,
    tieneCambios,
    passwordInvalida,
  }) => (
    <tr className={usuario.estatus === "inactivo" ? "fila-inactiva" : ""}>
      <td className="user-id">#{usuario.id}</td>

      <td className="user-name">
        {usuario.nombre} {usuario.apellido}
        {usuario.estatus && usuario.estatus !== "activo" && (
          <span className="estatus-badge">{usuario.estatus}</span>
        )}
      </td>

      <td>
        {usuario.correo ? (
          <input
            type="email"
            value={emailValue ?? usuario.correo}
            onChange={(e) => onEmailChange(usuario.id, e.target.value)}
            className="form-input"
            disabled={loading}
          />
        ) : (
          <span className="sin-correo">Sin correo registrado</span>
        )}
      </td>

      <td>
        <div className="cred-cell">
          {/* Username */}
          <div className="cred-box cred-box--user">
            <span className="cred-label">Usuario</span>
            <code className="cred-value">{usuario.username || "N/A"}</code>
            {usuario.username && (
              <button
                type="button"
                className="icon-btn icon-btn--primary"
                onClick={() => onCopiar(usuario.username, "Usuario")}
                title="Copiar usuario"
              >
                <Copy size={13} />
              </button>
            )}
          </div>

          {/* Contraseña */}
          <div className="cred-box cred-box--pass">
            <span className="cred-label">Clave</span>

            {editandoPassword ? (
              <>
                <input
                  type="text"
                  value={passwordValue || ""}
                  onChange={(e) => onPasswordChange(usuario.id, e.target.value)}
                  className={`cred-input ${
                    passwordInvalida ? "cred-input--invalida" : ""
                  }`}
                  placeholder={`Nueva contraseña (mín. ${MIN_PASSWORD})`}
                  minLength={MIN_PASSWORD}
                />
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => onCancelarEdicion(usuario.id)}
                  title="Cancelar edición"
                >
                  <X size={13} />
                </button>
              </>
            ) : (
              <>
                <code className="cred-value">
                  {passwordVisible ? usuario.contrasena || "N/A" : "••••••••"}
                </code>
                {usuario.contrasena && (
                  <div className="cred-actions">
                    <button
                      type="button"
                      className="icon-btn icon-btn--warning"
                      onClick={() => onTogglePassword(usuario.id)}
                      title={
                        passwordVisible
                          ? "Ocultar contraseña"
                          : "Mostrar contraseña"
                      }
                    >
                      {passwordVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--warning"
                      onClick={() => onCopiar(usuario.contrasena, "Contraseña")}
                      title="Copiar contraseña"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--info"
                      onClick={() =>
                        onIniciarEdicion(usuario.id, usuario.contrasena)
                      }
                      title="Editar contraseña"
                    >
                      <Edit size={13} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </td>

      <td>
        <span className={`rol-badge rol-${usuario.rol}`}>{usuario.rol}</span>
      </td>

      <td>
        {usuario.rol !== "cliente" ? (
          <span className="celda-vacia">—</span>
        ) : usuario.tipo_nivel ? (
          <span className="nivel-badge">
            {formatearNivel(usuario.tipo_nivel)}
          </span>
        ) : (
          <span className="nivel-vacio">Sin nivel</span>
        )}
      </td>

      <td className="fecha-registro">
        {formatearFechaRegistro(usuario.fecha_registro)}
      </td>

      <td>
        <div className="table-actions">
          <button
            type="button"
            className="action-btn btn-success"
            onClick={() => onGuardar(usuario.id)}
            disabled={loading || !tieneCambios || passwordInvalida}
            title="Guardar cambios"
          >
            <Save size={15} />
            Guardar
          </button>

          {usuario.estatus === "inactivo" && (
            <button
              type="button"
              className="action-btn btn-reactivar"
              onClick={() => onReactivar(usuario)}
              disabled={loading}
              title="Reactivar cuenta"
            >
              <RotateCcw size={15} />
              Activar
            </button>
          )}

          <button
            type="button"
            className="action-btn btn-danger"
            onClick={() => onEliminar(usuario)}
            disabled={loading}
            title="Eliminar cuenta"
          >
            <Trash2 size={15} />
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  )
);

UsuarioRow.displayName = "UsuarioRow";

export default UsuarioRow;
