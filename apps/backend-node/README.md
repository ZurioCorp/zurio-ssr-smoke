# backend-node test fixture

`GET /health` returns HTTP 200 by default. The optional BA-1 fault hook is off
unless the platform identifies this as a `test` environment and the app sets
both of these values:

- `OTEL_RESOURCE_ATTRIBUTES` must contain the platform-injected
  `deployment.environment.name=test` attribute
- `ENABLE_SMOKE_FAILURE_FIXTURE=true`
- `BA1_TEST_GATE_VALUE=<temporary secret>`

With the hook enabled, only `GET /health` requests carrying the matching
`x-zurio-ba1-test-token` header receive HTTP 503, and only for the first two
matching requests handled by each process. Requests without the token keep
returning HTTP 200, including the platform health check. The header is not
written to the fixture's request log.

Use a fresh secret for a controlled test and remove the enable flag and secret
afterward, or roll back to the known-good deployment. Do not enable the hook in
production. The limit is per process, so keep this test fixture at one replica
for an exact two-request sample.
