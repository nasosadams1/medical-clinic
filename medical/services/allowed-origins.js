const DEV_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
];

const normalizeOrigin = (origin = "") => String(origin).trim().replace(/\/+$/, "");
const escapeRegex = (value) => value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
const dedupeOrigins = (origins = []) => [...new Set(origins.map(normalizeOrigin).filter(Boolean))];
const LOCALHOST_ORIGIN_PATTERN = /^https?:\/\/(localhost|127(?:\.\d{1,3}){3})(?::\d+)?$/i;

export function resolveRequestOrigin(req) {
  if (!req) return "";

  const forwardedProto = String(req.headers?.["x-forwarded-proto"] || "").split(",")[0].trim();
  const forwardedHost = String(req.headers?.["x-forwarded-host"] || "").split(",")[0].trim();
  const directHost = String(req.headers?.host || "").trim();
  const protocol =
    forwardedProto ||
    (req.protocol ? String(req.protocol).trim() : "");
  const host = forwardedHost || directHost;

  if (!protocol || !host) {
    return "";
  }

  return normalizeOrigin(`${protocol}://${host}`);
}

export function matchesAllowedOrigin(origin, allowedOrigin) {
  const normalizedOrigin = normalizeOrigin(origin);
  const normalizedAllowedOrigin = normalizeOrigin(allowedOrigin);

  if (!normalizedOrigin || !normalizedAllowedOrigin) {
    return false;
  }

  if (!normalizedAllowedOrigin.includes("*")) {
    return normalizedOrigin === normalizedAllowedOrigin;
  }

  const pattern = `^${escapeRegex(normalizedAllowedOrigin).replace(/\*/g, "[^/]+")}$`;
  return new RegExp(pattern).test(normalizedOrigin);
}

export function isLocalhostOrigin(origin) {
  return LOCALHOST_ORIGIN_PATTERN.test(normalizeOrigin(origin));
}

export function getDevAllowedOrigins() {
  return [...DEV_ALLOWED_ORIGINS];
}

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
  return allowedOrigins.some((allowedOrigin) => matchesAllowedOrigin(origin, allowedOrigin));
}

export function isAllowedOriginForRequest(origin, allowedOrigins, isProduction, req) {
  if (isAllowedOrigin(origin, allowedOrigins, isProduction)) {
    return true;
  }

  const requestOrigin = resolveRequestOrigin(req);
  if (!requestOrigin || !origin) {
    return false;
  }

  return matchesAllowedOrigin(origin, requestOrigin);
}

export function formatAllowedOriginsError(serviceLabel, envKeys = []) {
  return `${serviceLabel} CORS is not configured. Set ${envKeys.join(", ")} to your frontend origin(s).`;
}
