// Una línea JSON por evento, a stdout: es lo que Zurio recoge como logs de la app.
export function log(level: "info" | "warn" | "error", msg: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, service: "ssr-next", msg, ...fields }));
}
