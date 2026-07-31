const jwt = require('jsonwebtoken');

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || null;

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!ADMIN_API_KEY) return res.status(503).json({ error: 'API not configured' });
  if (!key || key !== ADMIN_API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function requireJwt(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = header.split(' ')[1];
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) return res.status(503).json({ error: 'Auth not configured' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { requireApiKey, requireJwt };
