import assert from "node:assert/strict";
import test from "node:test";
import { createTestFailureGate } from "./testFailureGate.js";

test("disabled by default", () => {
  const gate = createTestFailureGate({ environment: "test", enabled: false, token: "secret", maxFailures: 2 });
  assert.equal(gate("secret"), false);
});

test("requires the configured token", () => {
  const gate = createTestFailureGate({ environment: "test", enabled: true, token: "secret", maxFailures: 2 });
  assert.equal(gate("wrong"), false);
  assert.equal(gate("secret"), true);
});

test("allows only the configured number of failures", () => {
  const gate = createTestFailureGate({ environment: "test", enabled: true, token: "secret", maxFailures: 2 });
  assert.equal(gate("secret"), true);
  assert.equal(gate("secret"), true);
  assert.equal(gate("secret"), false);
});

test("never enables the gate without a token", () => {
  const gate = createTestFailureGate({ environment: "test", enabled: true, token: "", maxFailures: 2 });
  assert.equal(gate(""), false);
});

test("never enables the gate outside test", () => {
  const gate = createTestFailureGate({ environment: "production", enabled: true, token: "secret", maxFailures: 2 });
  assert.equal(gate("secret"), false);
});

test("treats a non-finite failure limit as disabled", () => {
  const gate = createTestFailureGate({ environment: "test", enabled: true, token: "secret", maxFailures: Number.NaN });
  assert.equal(gate("secret"), false);
});
