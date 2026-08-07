// Carga las variables de entorno desde Backend/.env (soportado nativamente por Node 20.12+).
// Si el archivo no existe se asume que las variables ya vienen del entorno del sistema.
import path from "node:path";
import { fileURLToPath } from "node:url";

const envPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.env"
);

try {
  process.loadEnvFile(envPath);
} catch {
  // Sin archivo .env local: se usan las variables ya definidas en el entorno.
}
