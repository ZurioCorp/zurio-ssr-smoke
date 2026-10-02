import { log } from "../../lib/log";

export const dynamic = "force-dynamic";
export function GET() {
  log("info", "health", { port_env: process.env.PORT ?? null });
  return Response.json({ status: "ok", fixture: "ssr-next" });
}
