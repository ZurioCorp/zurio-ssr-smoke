import http from "node:http";

const port = Number(process.env.PORT || 3000);
http.createServer((request, response) => {
  const path = new URL(request.url || "/", "http://localhost").pathname;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(path === "/health" ? { status: "ok", fixture: "backend-node" } : { message: "backend smoke", path }));
}).listen(port, "0.0.0.0");
