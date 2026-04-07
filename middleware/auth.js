import jwt from 'jsonwebtoken';

function getTokenFromHeader(req) {
  const header = req.header('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

export function requireAuth(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret_change_me');
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (req.user.role !== role) return res.status(403).json({ error: `Only ${role} users can perform this action.` });
    return next();
  };
}
