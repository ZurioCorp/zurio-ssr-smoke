import http from "node:http";
import { randomUUID } from "node:crypto";
import { createTestFailureGate } from "./testFailureGate.js";

const port = Number(process.env.PORT || 3000);
const shouldEmitTestFailure = createTestFailureGate({
  resourceAttributes: process.env.OTEL_RESOURCE_ATTRIBUTES,
  enabled: process.env.ENABLE_SMOKE_FAILURE_FIXTURE === "true",
  token: process.env.BA1_TEST_GATE_VALUE || "",
  maxFailures: 2,
});

// Una línea JSON por evento, a stdout: es lo que Zurio recoge como logs de la app.
function log(level, msg, fields = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, service: "backend-node", msg, ...fields }));
}
const products = [
  { id: "prod_001", name: "Workspace Starter", price_cents: 1900, active: true },
  { id: "prod_002", name: "Workspace Pro", price_cents: 7900, active: true },
  { id: "prod_003", name: "Legacy Plan", price_cents: 0, active: false },
];

const orders = [
  { id: "ord_001", product_id: "prod_002", quantity: 1, state: "paid" },
  { id: "ord_002", product_id: "prod_001", quantity: 2, state: "pending" },
];

function json(response, status, body, startedAt, requestId) {
  const duration = Number((performance.now() - startedAt).toFixed(2));
  log(status >= 500 ? "error" : status >= 400 ? "warn" : "info", "request", { method: response.req?.method, path: response.req?.url, status, duration_ms: duration, request_id: requestId });
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.setHeader("server-timing", `app;dur=${duration}`);
  response.setHeader("x-request-id", requestId);
  response.setHeader("x-response-time-ms", String(duration));
  response.end(JSON.stringify({ ...body, request_id: requestId, response_time_ms: duration }));
}

async function delayFromQuery(url) {
  const delayMs = Math.min(Math.max(Number(url.searchParams.get("delay_ms") || 0), 0), 2000);
  if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
}

const server = http.createServer(async (request, response) => {
  const startedAt = performance.now();
  const url = new URL(request.url || "/", "http://localhost");
  const requestId = request.headers["x-request-id"] || randomUUID();
  await delayFromQuery(url);

  if (request.method !== "GET") {
    return json(response, 405, { error: "method_not_allowed" }, startedAt, requestId);
  }
  // Ayuda de prueba: emite una línea de cada nivel para comprobar que los logs llegan (GET /api/v1/log-demo).
  if (url.pathname === "/api/v1/log-demo") {
    log("info", "log-demo: info", { request_id: requestId });
    log("warn", "log-demo: warn", { request_id: requestId });
    log("error", "log-demo: error", { request_id: requestId, reason: "línea de error de prueba" });
    return json(response, 200, { status: "logged", levels: ["info", "warn", "error"] }, startedAt, requestId);
  }
  if (url.pathname === "/health") {
    if (shouldEmitTestFailure(request.headers["x-zurio-ba1-test-token"])) {
      return json(response, 503, { error: "controlled_test_failure", fixture: "ba1-test" }, startedAt, requestId);
    }
    return json(response, 200, { status: "ok", fixture: "backend-node", version: "v1" }, startedAt, requestId);
  }
  if (url.pathname === "/api/v1/products") {
    const activeOnly = url.searchParams.get("active") === "true";
    const page = Math.max(Number(url.searchParams.get("page") || 1), 1);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 100);
    const filtered = activeOnly ? products.filter((product) => product.active) : products;
    const data = filtered.slice((page - 1) * limit, page * limit);
    return json(response, 200, { data, meta: { page, limit, total: filtered.length } }, startedAt, requestId);
  }
  const productMatch = url.pathname.match(/^\/api\/v1\/products\/([^/]+)$/);
  if (productMatch) {
    const product = products.find((candidate) => candidate.id === productMatch[1]);
    return product
      ? json(response, 200, { data: product }, startedAt, requestId)
      : json(response, 404, { error: "not_found", resource: "product" }, startedAt, requestId);
  }
  if (url.pathname === "/api/v1/orders") {
    return json(response, 200, { data: orders, meta: { total: orders.length } }, startedAt, requestId);
  }
  return json(response, 404, { error: "not_found", path: url.pathname }, startedAt, requestId);
});

server.listen(port, "0.0.0.0", () => {
  const address = server.address();
  log("info", "listening", { port: typeof address === "object" && address ? address.port : port, port_env: process.env.PORT ?? null });
});
