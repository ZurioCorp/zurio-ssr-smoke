import { log } from "../../../lib/log";

export const dynamic = "force-dynamic";

// Ayuda de prueba: emite una línea de cada nivel para comprobar que los logs llegan (GET /api/log-demo).
export function GET() {
  log("info", "log-demo: info");
  log("warn", "log-demo: warn");
  log("error", "log-demo: error", { reason: "línea de error de prueba" });
  return Response.json({ status: "logged", levels: ["info", "warn", "error"] });
}
