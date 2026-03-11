export function resolveAllowedOrigins(envKeys = []) {
  for (const envKey of envKeys) {
    const rawValue = String(process.env[envKey] || "").trim();
    if (!rawValue) continue;

    return {
      sourceEnv: envKey,
      origins: rawValue
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    };
  }

  return {
    sourceEnv: null,
    origins: [],
  };
}

export function isAllowedOrigin(origin, allowedOrigins, isProduction) {
  if (!origin) return true;
  if (allowedOrigins.length === 0) return !isProduction;
  return allowedOrigins.includes(origin);
}

export function formatAllowedOriginsError(serviceLabel, envKeys = []) {
  return `${serviceLabel} CORS is not configured. Set ${envKeys.join(", ")} to your frontend origin(s).`;
}
