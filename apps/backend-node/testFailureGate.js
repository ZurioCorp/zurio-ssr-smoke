export function createTestFailureGate({ resourceAttributes, enabled, token, maxFailures = 0 }) {
  const limit = Number.isFinite(maxFailures) ? Math.max(0, Math.floor(maxFailures)) : 0;
  const isTestEnvironment = (resourceAttributes ?? "")
    .split(",")
    .some((attribute) => attribute.trim() === "deployment.environment.name=test");
  let failuresRemaining = isTestEnvironment && enabled && token ? limit : 0;

  return (providedToken) => {
    if (failuresRemaining === 0 || !token || providedToken !== token) return false;
    failuresRemaining -= 1;
    return true;
  };
}
