// src/config/http.js
// Envía el token de sesión en toda llamada al backend y gestiona el 401.
//
// La app llama al API con axios en unos sitios y con fetch en otros (más de
// cien llamadas repartidas entre componentes). En lugar de tocar cada una, aquí
// se instala un interceptor de axios y se envuelve window.fetch: cualquier
// petición al backend sale con Authorization: Bearer <token> sin cambiar el
// código que ya existe.
import axios from "axios";
import { cerrarSesion, obtenerToken } from "../utils/sesion";

// Hosts que corresponden al backend propio (producción y desarrollo local).
const HOSTS_API = [
  "elrefugiocountryclub.com/api",
  "localhost:3001",
  "127.0.0.1:3001",
];

const esUrlApi = (url = "") =>
  url.startsWith("/api/") || HOSTS_API.some((host) => url.includes(host));

// ---------- redirección a un backend local (solo desarrollo) ----------
//
// La URL de producción está escrita a mano en más de cien llamadas. Para poder
// probar contra un backend local sin tocarlas, basta definir en
// country_app/.env.local:
//
//   VITE_API_BASE=http://localhost:3001
//
// Sin esa variable no pasa nada: todo sigue yendo a producción.
const API_PRODUCCION = "https://elrefugiocountryclub.com/api";
const API_BASE_LOCAL = import.meta.env.DEV
  ? import.meta.env.VITE_API_BASE
  : undefined;

if (API_BASE_LOCAL) {
  console.info(`🔧 Llamadas al API redirigidas a ${API_BASE_LOCAL}`);
}

const reescribirUrl = (url) => {
  if (!API_BASE_LOCAL || typeof url !== "string") return url;
  if (!url.startsWith(API_PRODUCCION)) return url;
  return API_BASE_LOCAL + url.slice(API_PRODUCCION.length);
};

/**
 * Sesión vencida o token inválido: se limpia y se manda al login.
 * Se ignora en el propio login, donde un 401 solo significa que el usuario
 * escribió mal sus credenciales.
 */
const manejarSesionInvalida = (url = "") => {
  if (url.includes("/login")) return;
  if (window.location.pathname === "/login") return;

  cerrarSesion();
  window.location.href = "/login?sesion=expirada";
};

// ---------- axios ----------

axios.interceptors.request.use((config) => {
  config.url = reescribirUrl(config.url);
  const token = obtenerToken();
  if (token && esUrlApi(config.url || "")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    if (error.response?.status === 401) {
      manejarSesionInvalida(error.config?.url || "");
    }
    return Promise.reject(error);
  }
);

// ---------- fetch ----------

const fetchOriginal = window.fetch.bind(window);

window.fetch = async (entradaOriginal, opciones = {}) => {
  const urlOriginal =
    typeof entradaOriginal === "string"
      ? entradaOriginal
      : entradaOriginal?.url || String(entradaOriginal || "");

  const url = reescribirUrl(urlOriginal);

  // Si la URL cambió (modo local) se reconstruye la entrada con la nueva.
  let entrada = entradaOriginal;
  if (url !== urlOriginal) {
    entrada =
      typeof entradaOriginal === "string"
        ? url
        : new Request(url, entradaOriginal);
  }

  if (!esUrlApi(url)) return fetchOriginal(entrada, opciones);

  const token = obtenerToken();
  const cabeceras = new Headers(
    opciones.headers ||
      (typeof Request !== "undefined" && entrada instanceof Request
        ? entrada.headers
        : undefined)
  );

  if (token && !cabeceras.has("Authorization")) {
    cabeceras.set("Authorization", `Bearer ${token}`);
  }

  const respuesta = await fetchOriginal(entrada, {
    ...opciones,
    headers: cabeceras,
  });

  if (respuesta.status === 401) manejarSesionInvalida(url);

  return respuesta;
};
