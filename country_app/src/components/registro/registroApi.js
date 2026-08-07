// src/components/registro/registroApi.js
// Llamadas HTTP propias de la vista de Registro de Usuarios.

import axios from "axios";
import { API_BASE } from "./constants";

const USERS_URL = `${API_BASE}/users`;

/**
 * Pide al backend el username definitivo (con su sufijo si ya existe otro
 * igual) para el nombre/apellido dados. Devuelve null si falla, para que la
 * vista pueda caer a la generación local sin romperse.
 */
export const obtenerCredencialesPreview = async ({
  nombre,
  apellido,
  customPassword = null,
}) => {
  try {
    const { data } = await axios.post(`${USERS_URL}/preview-credentials`, {
      nombre,
      apellido,
      customPassword,
    });
    return data?.credentials || null;
  } catch (error) {
    console.error("Error al obtener credenciales de vista previa:", error);
    return null;
  }
};

export const actualizarCorreoUsuario = async (id, email) => {
  try {
    await axios.patch(`${USERS_URL}/update-email/${id}`, { email });
    return true;
  } catch (error) {
    console.error("Error al actualizar correo:", error);
    return false;
  }
};

export const actualizarPasswordUsuario = async (id, password) => {
  try {
    await axios.patch(`${USERS_URL}/update-password/${id}`, { password });
    return true;
  } catch (error) {
    console.error("Error al actualizar contraseña:", error);
    return false;
  }
};

/**
 * Elimina la cuenta. El backend responde 409 cuando el usuario tiene historial
 * (reservas, pagos o clases dictadas): en ese caso no se borra nada y se
 * devuelve el detalle para poder ofrecer la desactivación como alternativa.
 */
export const eliminarUsuario = async (id) => {
  try {
    const { data } = await axios.delete(`${USERS_URL}/${id}`);
    return { ok: true, mensaje: data.message };
  } catch (error) {
    const respuesta = error.response;
    console.error("Error al eliminar usuario:", error);
    return {
      ok: false,
      conHistorial: respuesta?.status === 409,
      dependencias: respuesta?.data?.dependencias || null,
      mensaje: respuesta?.data?.error || "No se pudo eliminar la cuenta",
    };
  }
};

export const cambiarEstatusUsuario = async (id, estatus) => {
  try {
    await axios.patch(`${USERS_URL}/update-status/${id}`, { estatus });
    return true;
  } catch (error) {
    console.error("Error al cambiar el estatus:", error);
    return false;
  }
};
