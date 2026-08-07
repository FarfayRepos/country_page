// server/auth.js
// Autenticación por JWT y control de acceso por rol.
import "./env.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "12h";

// Sin secreto no se arranca: usar uno aleatorio o por defecto haría que los
// tokens dejaran de ser confiables (o se invalidaran en cada reinicio) sin que
// nadie se entere.
if (!JWT_SECRET) {
  console.error(
    "❌ Falta la variable de entorno JWT_SECRET. Defínela en Backend/.env " +
      "(o en las variables del servidor) antes de iniciar el backend."
  );
  process.exit(1);
}

// Roles del personal con acceso al panel de gestión de usuarios y contabilidad.
export const ROLES_STAFF = ["administrador", "creadorcuentas"];

export const firmarToken = (usuario) =>
  jwt.sign(
    {
      id: usuario.id,
      rol: usuario.rol || "cliente",
      username: usuario.username,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

/**
 * Exige un token válido. Deja los datos del token en `req.usuario`.
 */
export const verificarToken = (req, res, next) => {
  const cabecera = req.headers.authorization || "";
  const [esquema, token] = cabecera.split(" ");

  if (esquema !== "Bearer" || !token) {
    return res.status(401).json({ error: "Sesión requerida", codigo: "SIN_TOKEN" });
  }

  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    const expirado = err.name === "TokenExpiredError";
    return res.status(401).json({
      error: expirado ? "La sesión expiró" : "Sesión inválida",
      codigo: expirado ? "TOKEN_EXPIRADO" : "TOKEN_INVALIDO",
    });
  }
};

/**
 * Exige que el rol del token esté en la lista. Usar siempre después de
 * verificarToken.
 */
export const requiereRol =
  (...roles) =>
  (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: "Sesión requerida", codigo: "SIN_TOKEN" });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: "No tienes permisos para realizar esta acción",
        codigo: "SIN_PERMISO",
      });
    }
    return next();
  };

// Atajo para las rutas de gestión: administrador o creador de cuentas.
export const requiereStaff = [verificarToken, requiereRol(...ROLES_STAFF)];

/**
 * Permite la acción al propio usuario o a alguien del staff. `obtenerId`
 * extrae de la petición el id del usuario afectado (por defecto req.params.id).
 */
export const requiereSelfOStaff =
  (obtenerId = (req) => req.params.id) =>
  (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: "Sesión requerida", codigo: "SIN_TOKEN" });
    }

    if (ROLES_STAFF.includes(req.usuario.rol)) return next();

    if (String(obtenerId(req)) === String(req.usuario.id)) return next();

    return res.status(403).json({
      error: "Solo puedes modificar tu propia cuenta",
      codigo: "SIN_PERMISO",
    });
  };
