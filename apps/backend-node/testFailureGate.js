export function createTestFailureGate({ environment, enabled, token, maxFailures = 0 }) {
  const limit = Number.isFinite(maxFailures) ? Math.max(0, Math.floor(maxFailures)) : 0;
  let failuresRemaining = environment === "test" && enabled && token ? limit : 0;

  return (providedToken) => {
    if (failuresRemaining === 0 || !token || providedToken !== token) return false;
    failuresRemaining -= 1;
    return true;
  };
}
