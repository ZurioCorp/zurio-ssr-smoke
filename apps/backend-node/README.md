# backend-node test fixture

`GET /health` returns HTTP 200 by default. The optional BA-1 fault hook is off
unless the deployment explicitly sets all of these values:

- `ZURIO_ENVIRONMENT=test`
- `ZURIO_ENABLE_BA1_TEST_5XX=true`
- `ZURIO_BA1_TEST_5XX_TOKEN=<temporary secret>`

With the hook enabled, only `GET /health` requests carrying the matching
`x-zurio-ba1-test-token` header receive HTTP 503, and only for the first two
matching requests handled by each process. Requests without the token keep
returning HTTP 200, including the platform health check. The header is not
written to the fixture's request log.

Use a fresh secret for a controlled test and remove all three environment
values after the test or roll back to the known-good deployment. Do not enable
the hook in production. The limit is per process, so keep this test fixture at
one replica for an exact two-request sample.
