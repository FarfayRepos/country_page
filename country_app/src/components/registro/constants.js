// src/components/registro/constants.js
// Catálogos y configuración compartida por la vista de Registro de Usuarios.

export const API_BASE = "https://elrefugiocountryclub.com/api/api";

export const ROLES = [
  { value: "administrador", label: "Administrador" },
  { value: "cliente", label: "Cliente" },
  { value: "instructora", label: "Instructora" },
  { value: "creadorcuentas", label: "Creador de Cuentas" },
];

export const TIPOS_CLIENTE = [
  "propietario",
  "demo",
  "general",
  "renta",
  "media_renta",
];

export const TIPOS_NIVEL = [
  "iniciacion",
  "ponyclub",
  "paseo",
  "intermedio",
  "avanzado",
];

export const ESPECIALIDADES = [
  "mixto",
  "iniciacion",
  "ponyclub",
  "intermedio",
  "paseo",
  "salto",
];

export const MIN_PASSWORD = 8;

export const FORM_INICIAL = {
  nombre: "",
  apellido: "",
  email: "",
  rol: "cliente",
  edad: "",
  telefono: "",
  tipo_cliente: "",
  nivel: "",
  tipo_nivel: "",
  especialidad: "mixto",
};

// Opciones por defecto de los toast de esta vista.
export const TOAST_OPTS = { position: "top-right", autoClose: 3000 };
