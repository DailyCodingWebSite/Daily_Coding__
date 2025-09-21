const jwt = require('jsonwebtoken');

function auth(required = true) {
  return (req, res, next) => {
    try {
      const header = req.headers['authorization'] || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) {
        if (!required) return next();
        return res.status(401).json({ success: false, message: 'Missing token' });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      req.user = decoded;
      next();
    } catch (err) {
      if (!required) return next();
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
  };
}

function requireRole(roles) {
  const roleList = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user || !roleList.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
}

module.exports = { auth, requireRole };
