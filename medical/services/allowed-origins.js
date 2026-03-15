const DEV_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const dedupeOrigins = (origins = []) => [...new Set(origins.filter(Boolean))];

export function resolveAllowedOrigins(envKeys = [], options = {}) {
  const { isProduction = false } = options;
  const configuredOrigins = [];
  const sourceEnvKeys = [];

  for (const envKey of envKeys) {
    const rawValue = String(process.env[envKey] || "").trim();
    if (!rawValue) continue;

    sourceEnvKeys.push(envKey);
    configuredOrigins.push(
      ...rawValue
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    );
  }

  if (configuredOrigins.length > 0) {
    return {
      sourceEnv: sourceEnvKeys.join(", "),
      origins: isProduction
        ? dedupeOrigins(configuredOrigins)
        : dedupeOrigins([...configuredOrigins, ...DEV_ALLOWED_ORIGINS]),
    };
  }

  return {
    sourceEnv: null,
    origins: isProduction ? [] : [...DEV_ALLOWED_ORIGINS],
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
