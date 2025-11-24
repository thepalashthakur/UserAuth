const User = require('../models/user');

async function requireAuth(req, res, next) {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user && req.user.id === userId) {
      return next();
    }

    const user = await User.findById(userId);
    if (!user) {
      req.session.userId = null;
      return res.status(401).json({ error: 'Not authenticated' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
