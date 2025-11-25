const mongoose = require('mongoose');
const User = require('../models/user');

function sanitizeUser(user) {
  if (!user) return user;
  const plain = user.toObject ? user.toObject({ virtuals: true }) : { ...user };
  plain.id = plain.id || user.id || (user._id ? String(user._id) : undefined);
  delete plain.passwordHash;
  return plain;
}

async function requireAuth(req, res, next) {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!mongoose.isValidObjectId(userId)) {
      req.session.destroy?.(() => {});
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user && req.user.id === userId) {
      req.user = sanitizeUser(req.user);
      return next();
    }

    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      req.session.destroy?.(() => {});
      return res.status(401).json({ error: 'Not authenticated' });
    }

    req.user = sanitizeUser(user);
    next();
  } catch (err) {
    next(err);
  }
}

function checkAdmin(req, res, next) {
  const user = req.user;
  // req.user is guaranteed when requireAuth runs first.
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Compose to avoid relying on middleware order.
const requireAdmin = [requireAuth, checkAdmin];

module.exports = { requireAuth, requireAdmin };
