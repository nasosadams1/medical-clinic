const parseUserIds = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const PLATFORM_ADMIN_USER_IDS = [
  ...new Set([
    ...parseUserIds(process.env.ADMIN_USER_IDS || ''),
    ...parseUserIds(process.env.FEEDBACK_ADMIN_USER_IDS || ''),
    ...parseUserIds(process.env.DUEL_ADMIN_USER_IDS || ''),
    ...parseUserIds(process.env.LEADS_ADMIN_USER_IDS || ''),
  ]),
];

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
};

export const createAuthenticatedUserMiddleware =
  (supabaseAdmin, serviceLabel = 'API') =>
  async (req, res, next) => {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: `${serviceLabel} is not configured.` });
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token.' });
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    req.authenticatedUser = data.user;
    return next();
  };

export const resolveOptionalUser = async (supabaseAdmin, req) => {
  if (!supabaseAdmin) {
    return null;
  }

  const token = getBearerToken(req);
  if (!token) {
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return null;
  }

  return data.user;
};

export const isPrivilegedAdmin = (user) => {
  if (!user) return false;
  if (PLATFORM_ADMIN_USER_IDS.includes(user.id)) return true;
  if (user.app_metadata?.role === 'admin') return true;
  if (user.app_metadata?.is_admin === true) return true;
  if (user.user_metadata?.role === 'admin') return true;
  if (user.user_metadata?.is_admin === true) return true;
  return false;
};

export const getRequestIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || null;
};
