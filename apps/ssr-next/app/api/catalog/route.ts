import { log } from "../../../lib/log";

const items = [
  { id: "mock-1", name: "Starter workspace", status: "ready" },
  { id: "mock-2", name: "Preview deployment", status: "running" },
];

export const dynamic = "force-dynamic";

export function GET() {
  const startedAt = performance.now();
  const body = {
    service: "ssr-next-api",
    items,
    backend_ms: Number((performance.now() - startedAt).toFixed(2)),
  };
  log("info", "catalog", { backend_ms: body.backend_ms, items: items.length });
  return Response.json(body, {
    headers: {
      "cache-control": "no-store",
      "server-timing": `mock-api;dur=${body.backend_ms}`,
      "x-fixture": "ssr-next",
    },
  });
}
