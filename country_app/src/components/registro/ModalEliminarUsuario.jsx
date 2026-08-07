// src/components/registro/ModalEliminarUsuario.jsx
import React, { useCallback, useState } from "react";
import { AlertTriangle, Loader, Trash2, UserX, X } from "lucide-react";
import { toast } from "react-toastify";
import { cambiarEstatusUsuario, eliminarUsuario } from "./registroApi";
import { TOAST_OPTS } from "./constants";
import "../../CSS/ModalEliminarUsuario.css";

/**
 * Confirmación de borrado de cuenta.
 *
 * Si el backend responde que la cuenta tiene historial (409) no se elimina
 * nada: el modal pasa a mostrar el detalle y ofrece desactivarla, que es la
 * alternativa segura para no dejar reservas ni pagos huérfanos.
 *
 * `usuario` admite dos formas, porque lo usan dos vistas con datos distintos:
 *   { id, nombre, apellido, username, correo, rol }   → Gestión de Usuarios
 *   { id, nombreCompleto, correo, rol }               → panel de Administración
 * Los campos que falten simplemente no se muestran.
 */
const ModalEliminarUsuario = ({ usuario, onCerrar, onCompletado }) => {
  const [procesando, setProcesando] = useState(false);
  const [bloqueo, setBloqueo] = useState(null);

  const nombreCompleto =
    usuario.nombreCompleto ||
    `${usuario.nombre || ""} ${usuario.apellido || ""}`.trim() ||
    `Usuario #${usuario.id}`;

  const handleEliminar = useCallback(async () => {
    setProcesando(true);
    const resultado = await eliminarUsuario(usuario.id);
    setProcesando(false);

    if (resultado.ok) {
      toast.success(resultado.mensaje, TOAST_OPTS);
      await onCompletado();
      onCerrar();
      return;
    }

    if (resultado.conHistorial) {
      setBloqueo(resultado.dependencias || {});
      return;
    }

    toast.error(resultado.mensaje, TOAST_OPTS);
  }, [usuario.id, onCompletado, onCerrar]);

  const handleDesactivar = useCallback(async () => {
    setProcesando(true);
    const ok = await cambiarEstatusUsuario(usuario.id, "inactivo");
    setProcesando(false);

    if (!ok) {
      toast.error("No se pudo desactivar la cuenta", TOAST_OPTS);
      return;
    }

    toast.success(`Cuenta de ${nombreCompleto} desactivada`, TOAST_OPTS);
    await onCompletado();
    onCerrar();
  }, [usuario.id, nombreCompleto, onCompletado, onCerrar]);

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !procesando) onCerrar();
      }}
    >
      <div className="modal-eliminar" role="dialog" aria-modal="true">
        <button
          type="button"
          className="modal-cerrar"
          onClick={onCerrar}
          disabled={procesando}
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className={`modal-icono ${bloqueo ? "modal-icono--aviso" : ""}`}>
          {bloqueo ? <AlertTriangle size={26} /> : <Trash2 size={26} />}
        </div>

        {!bloqueo ? (
          <>
            <h3 className="modal-titulo">¿Eliminar esta cuenta?</h3>
            <p className="modal-texto">
              Se eliminará permanentemente la cuenta de{" "}
              <strong>{nombreCompleto}</strong>
              {usuario.username && (
                <>
                  {" "}
                  (<code>{usuario.username}</code>)
                </>
              )}
              . Esta acción no se puede deshacer.
            </p>

            <div className="modal-datos">
              <span>
                ID <strong>#{usuario.id}</strong>
              </span>
              {usuario.rol && (
                <span>
                  Rol <strong>{usuario.rol}</strong>
                </span>
              )}
              <span>
                Correo <strong>{usuario.correo || "sin correo"}</strong>
              </span>
            </div>

            <div className="modal-acciones">
              <button
                type="button"
                className="modal-btn modal-btn--secundario"
                onClick={onCerrar}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="modal-btn modal-btn--peligro"
                onClick={handleEliminar}
                disabled={procesando}
              >
                {procesando ? (
                  <>
                    <Loader size={16} className="modal-spin" /> Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} /> Sí, eliminar
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="modal-titulo">La cuenta tiene historial</h3>
            <p className="modal-texto">
              No se puede eliminar a <strong>{nombreCompleto}</strong> porque
              borrarla dejaría registros sin dueño y descuadraría la
              contabilidad.
            </p>

            <ul className="modal-dependencias">
              {bloqueo.reservas > 0 && (
                <li>
                  <strong>{bloqueo.reservas}</strong> reserva(s) registrada(s)
                </li>
              )}
              {bloqueo.pagos > 0 && (
                <li>
                  <strong>{bloqueo.pagos}</strong> pago(s) en contabilidad
                </li>
              )}
              {bloqueo.clasesDictadas > 0 && (
                <li>
                  <strong>{bloqueo.clasesDictadas}</strong> clase(s) dictada(s)
                  como instructora
                </li>
              )}
            </ul>

            <p className="modal-texto modal-texto--sugerencia">
              Puedes desactivarla: la cuenta deja de poder usarse pero su
              historial se conserva.
            </p>

            <div className="modal-acciones">
              <button
                type="button"
                className="modal-btn modal-btn--secundario"
                onClick={onCerrar}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="modal-btn modal-btn--aviso"
                onClick={handleDesactivar}
                disabled={procesando}
              >
                {procesando ? (
                  <>
                    <Loader size={16} className="modal-spin" /> Desactivando...
                  </>
                ) : (
                  <>
                    <UserX size={16} /> Desactivar cuenta
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ModalEliminarUsuario;
