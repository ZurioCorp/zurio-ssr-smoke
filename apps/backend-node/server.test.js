import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const testGateValue = "only-for-local-test";

async function startServer({ enabled, environment = "test", includePlatformAttributes = true, spoofedEnvironment }) {
  const env = {
    ...process.env,
    PORT: "0",
    BA1_TEST_GATE_VALUE: testGateValue,
  };
  if (includePlatformAttributes) {
    env.OTEL_RESOURCE_ATTRIBUTES = `deployment.id=test-deploy,service.version=fixture,deployment.environment.name=${environment},whiskers.app_id=test-app`;
  } else {
    delete env.OTEL_RESOURCE_ATTRIBUTES;
  }
  if (spoofedEnvironment !== undefined) env.ZURIO_ENVIRONMENT = spoofedEnvironment;
  if (enabled) env.ENABLE_SMOKE_FAILURE_FIXTURE = "true";
  else delete env.ENABLE_SMOKE_FAILURE_FIXTURE;

  const child = spawn(process.execPath, ["server.js"], {
    cwd: directory,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let stdoutBuffer = "";
  const logs = [];
  const logListeners = new Set();
  const waitForLog = (predicate) => {
    const existing = logs.find(predicate);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      let timeout;
      const cleanup = () => {
        clearTimeout(timeout);
        logListeners.delete(onLog);
        child.removeListener("error", onError);
      };
      const onError = (error) => {
        cleanup();
        reject(error);
      };
      timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`timed out waiting for log: ${output}`));
      }, 5000);
      const onLog = (entry) => {
        if (!predicate(entry)) return;
        cleanup();
        resolve(entry);
      };
      logListeners.add(onLog);
      child.once("error", onError);
    });
  };
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    output += chunk;
    stdoutBuffer += chunk;
    const lines = stdoutBuffer.split("\n");
    stdoutBuffer = lines.pop() ?? "";
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        logs.push(entry);
        for (const listener of logListeners) listener(entry);
      } catch {
        // Application access logs use one JSON object per line.
      }
    }
  });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const listening = await waitForLog((entry) => entry.msg === "listening").catch((error) => {
    child.kill("SIGTERM");
    throw error;
  });

  return {
    baseUrl: `http://127.0.0.1:${listening.port}`,
    waitForLog,
    async stop() {
      if (child.exitCode !== null) return;
      child.kill("SIGTERM");
      await once(child, "exit");
    },
  };
}

async function health(server, requestId, token) {
  const logPromise = server.waitForLog((entry) => entry.request_id === requestId);
  const headers = { "x-request-id": requestId };
  if (token !== undefined) headers["x-zurio-ba1-test-token"] = token;
  const response = await fetch(`${server.baseUrl}/health`, { headers });
  return { response, log: await logPromise };
}

test("BA-1 hook emits two authenticated 503s, preserves health, and does not log its secret", async (t) => {
  const server = await startServer({ enabled: true });
  t.after(() => server.stop());

  const ordinary = await health(server, "health-ordinary");
  assert.equal(ordinary.response.status, 200);

  const wrongToken = await health(server, "health-wrong-token", "wrong-value");
  assert.equal(wrongToken.response.status, 200);

  const concurrent = await Promise.all(Array.from({ length: 8 }, (_, index) =>
    health(server, `health-test-failure-${index}`, testGateValue)));
  assert.deepEqual(concurrent.map(({ response }) => response.status).sort(), [200, 200, 200, 200, 200, 200, 503, 503]);
  const failures = concurrent.filter(({ response }) => response.status === 503);
  assert.ok(failures.every(({ log }) => log.status === 503 && log.level === "error"));
  assert.ok(failures.every(({ log }) => !JSON.stringify(log).includes(testGateValue)));

  const platformHealth = await health(server, "health-platform-after-test");
  assert.equal(platformHealth.response.status, 200);
});

test("BA-1 hook trusts platform environment identity instead of app-configured environment", async (t) => {
  const production = await startServer({ enabled: true, environment: "production", spoofedEnvironment: "test" });
  t.after(() => production.stop());
  const productionResponse = await health(production, "health-production", testGateValue);
  assert.equal(productionResponse.response.status, 200);

  const disabled = await startServer({ enabled: false });
  t.after(() => disabled.stop());
  const disabledResponse = await health(disabled, "health-disabled", testGateValue);
  assert.equal(disabledResponse.response.status, 200);

  const noPlatformIdentity = await startServer({ enabled: true, includePlatformAttributes: false });
  t.after(() => noPlatformIdentity.stop());
  const missingIdentityResponse = await health(noPlatformIdentity, "health-no-platform-identity", testGateValue);
  assert.equal(missingIdentityResponse.response.status, 200);
});
