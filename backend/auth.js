// backend/auth.js
import jwt from 'jwt-simple';

const JWT_SECRET = process.env.JWT_SECRET || 'zen_secret_vault_key_99';

export function generateToken(userId) {
  return jwt.encode({ userId }, JWT_SECRET);
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });

  try {
    const decoded = jwt.decode(token, JWT_SECRET);
    req.user = decoded;
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

export default function authMiddleware(req, res, next) {
  return authenticateToken(req, res, next);
}