// src/components/registro/helpers.js
// Utilidades puras de la vista de Registro de Usuarios.

const MAYUSCULAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MINUSCULAS = "abcdefghijklmnopqrstuvwxyz";
const NUMEROS = "0123456789";

// Contraseña de 8 caracteres con al menos una mayúscula, una minúscula y un número.
export const generarPasswordSegura = () => {
  const todos = MAYUSCULAS + MINUSCULAS + NUMEROS;
  let password = "";
  password += MAYUSCULAS[Math.floor(Math.random() * MAYUSCULAS.length)];
  password += MINUSCULAS[Math.floor(Math.random() * MINUSCULAS.length)];
  password += NUMEROS[Math.floor(Math.random() * NUMEROS.length)];
  for (let i = 0; i < 5; i++) {
    password += todos[Math.floor(Math.random() * todos.length)];
  }
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
};

const sinAcentos = (texto) =>
  texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(" ")[0];

// Username de respaldo cuando el backend no responde: nombre.apellido (máx. 15).
export const generarUsernamePreview = (nombre, apellido) => {
  if (!nombre || !apellido) return "";
  return `${sinAcentos(nombre)}.${sinAcentos(apellido)}`.substring(0, 15);
};

export const esEmailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const formatearFechaRegistro = (fecha) => {
  if (!fecha) return "—";
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatearNivel = (nivel) =>
  nivel === "iniciacion" ? "Iniciación" : nivel;

// Búsqueda por nombre, correo, username, rol, nivel o ID.
export const coincideBusqueda = (usuario, termino) => {
  const campos = [
    usuario.nombre,
    usuario.apellido,
    `${usuario.nombre || ""} ${usuario.apellido || ""}`,
    usuario.correo,
    usuario.username,
    usuario.rol,
    usuario.tipo_nivel,
    String(usuario.id),
  ];
  return campos.some((campo) =>
    (campo || "").toString().toLowerCase().includes(termino)
  );
};
