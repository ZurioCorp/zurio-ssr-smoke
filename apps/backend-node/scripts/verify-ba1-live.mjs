import { randomUUID } from "node:crypto";

const baseUrlValue = process.env.BA1_BASE_URL;
const token = process.env.BA1_TEST_GATE_VALUE;

if (!baseUrlValue || !token) {
  throw new Error("Set BA1_BASE_URL and BA1_TEST_GATE_VALUE for the test deployment.");
}

const baseUrl = new URL(baseUrlValue);
const isZurioHost = baseUrl.hostname === "zurio.io" || baseUrl.hostname.endsWith(".zurio.io");
const isLocalhost = baseUrl.hostname === "localhost" && baseUrl.port === "3000";
if ((!isZurioHost && !isLocalhost) || (isZurioHost && baseUrl.protocol !== "https:")) {
  throw new Error("BA1_BASE_URL must use https://*.zurio.io or http://localhost:3000.");
}

const healthUrl = new URL("/health", baseUrl);
const sampleSize = 100;
const concurrency = 10;

async function request({ includeToken, label }) {
  const started = performance.now();
  const response = await fetch(healthUrl, {
    headers: {
      "x-request-id": `ba1-live-${label}-${randomUUID()}`,
      ...(includeToken ? { "x-zurio-ba1-test-token": token } : {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  return { status: response.status, latencyMs: performance.now() - started };
}

const warmup = await request({ includeToken: false, label: "warmup" });
if (warmup.status !== 200) {
  throw new Error(`Unauthenticated health check returned ${warmup.status}; expected 200.`);
}

const firstFailure = await request({ includeToken: true, label: "sample-001" });
if (firstFailure.status !== 503) {
  throw new Error("The failure gate is not armed; publish a fresh test deployment before running this suite.");
}

const sample = [firstFailure];
for (let offset = 1; offset < sampleSize; offset += concurrency) {
  const batchSize = Math.min(concurrency, sampleSize - offset);
  const batch = await Promise.all(Array.from({ length: batchSize }, (_, index) =>
    request({ includeToken: true, label: String(offset + index + 1).padStart(3, "0") })));
  sample.push(...batch);
}

const afterGate = await request({ includeToken: true, label: "after-gate" });
const counts = sample.reduce((result, { status }) => {
  result[status] = (result[status] ?? 0) + 1;
  return result;
}, {});

if (sample.length !== sampleSize || counts[503] !== 2 || counts[200] !== sampleSize - 2) {
  throw new Error(`Expected 100 sampled requests (98 x 200, 2 x 503); got ${JSON.stringify(counts)}.`);
}
if (afterGate.status !== 200) {
  throw new Error(`The failure gate did not close after two failures (got ${afterGate.status}).`);
}

const sortedLatencies = sample.map(({ latencyMs }) => latencyMs).sort((a, b) => a - b);
const percentile = (p) => Number(sortedLatencies[Math.ceil(p * sortedLatencies.length) - 1].toFixed(2));
console.log(JSON.stringify({
  result: "passed",
  sampleSize: sample.length,
  statusCounts: counts,
  warmupStatus: warmup.status,
  afterGateStatus: afterGate.status,
  latencyMs: { p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99) },
  secretLogged: false,
}));
