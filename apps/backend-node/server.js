import http from "node:http";
import { randomUUID } from "node:crypto";

const port = Number(process.env.PORT || 3000);
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
  if (url.pathname === "/health") {
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

server.listen(port, "0.0.0.0", () => console.log(`backend-node listening on ${port}`));
