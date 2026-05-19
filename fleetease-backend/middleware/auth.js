const jwt = require('jsonwebtoken');

module.exports = (allowedRoles = []) => (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
    req.user = payload;
    if (allowedRoles.length && !allowedRoles.includes(payload.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
