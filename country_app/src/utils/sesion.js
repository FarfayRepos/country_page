// src/utils/sesion.js
// Punto único de acceso a la sesión guardada en sessionStorage.

const CLAVE_USUARIO = "user";
const CLAVE_TOKEN = "token";

export const guardarSesion = ({ user, token }) => {
  sessionStorage.setItem(CLAVE_USUARIO, JSON.stringify(user));
  if (token) sessionStorage.setItem(CLAVE_TOKEN, token);
};

export const obtenerToken = () => sessionStorage.getItem(CLAVE_TOKEN);

export const obtenerUsuario = () => {
  const crudo = sessionStorage.getItem(CLAVE_USUARIO);
  if (!crudo) return null;
  try {
    return JSON.parse(crudo);
  } catch {
    sessionStorage.removeItem(CLAVE_USUARIO);
    return null;
  }
};

// Hay sesión válida solo si están el usuario y el token: sin token el backend
// rechaza las rutas protegidas, así que un `user` suelto no sirve de nada.
export const haySesion = () => Boolean(obtenerUsuario() && obtenerToken());

export const cerrarSesion = () => {
  sessionStorage.clear();
};
