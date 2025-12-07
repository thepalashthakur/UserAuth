const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../../../models/user');
const formatUser = require('../../../utils/formatUser');

function validatePhone(phoneNumber) {
  return /^\d{10}$/.test(phoneNumber);
}

function validateCountryCode(countryCode) {
  return /^\+?\d{1,4}$/.test(countryCode);
}

async function register(req, res, next) {
  try {
    const { email, password, name, phoneNumber, countryCode } = req.body || {};

    if (!email || !password || !name || !phoneNumber || !countryCode) {
      return res
        .status(400)
        .json({ error: 'Email, password, name, phone number, and country code are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanedPhone = String(phoneNumber).trim();
    const cleanedCountry = String(countryCode).trim();

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!validatePhone(cleanedPhone)) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
    }

    if (!validateCountryCode(cleanedCountry)) {
      return res.status(400).json({ error: 'Country code must be 1-4 digits and may start with +' });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { phoneNumber: cleanedPhone, countryCode: cleanedCountry },
      ],
    });
    if (existingUser) {
      return res.status(409).json({ error: 'User with that email or phone already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      name: String(name).trim(),
      phoneNumber: cleanedPhone,
      countryCode: cleanedCountry,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: formatUser(user),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'User with that email or phone already exists' });
    }
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
        req.session.userId = user.id;
        req.session.save((saveErr) => {
          if (saveErr) return reject(saveErr);
          resolve();
        });
      });
    });

    res.json({
      message: 'Login successful',
      user: formatUser(user),
    });
  } catch (err) {
    next(err);
  }
}

function logout(req, res, next) {
  if (!req.session.userId) {
    return res.status(204).end();
  }
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.clearCookie('sid', { path: '/' });
    res.status(204).end();
  });
}

function me(req, res) {
  res.json(formatUser(req.user));
}

const PASSWORD_RESET_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function genericResetResponse(res, resetToken) {
  const body = { message: 'If that account exists, a password reset email has been sent.' };
  // Expose token only in non-production. Visible currently for testing
  if (resetToken && process.env.NODE_ENV !== 'production') {
    body.resetToken = resetToken;
  }
  return res.json(body);
}

async function requestPasswordReset(req, res, next) {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+passwordResetTokenHash +passwordResetExpires'
    );

    if (!user) {
      return genericResetResponse(res);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetTokenHash = resetTokenHash;
    user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_WINDOW_MS);
    await user.save();

    // In production, send resetToken via email. Visible currently for testing
    return genericResetResponse(res, resetToken);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetTokenHash +passwordResetExpires');

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Invalidate current session to force re-login with new password.
    req.session?.destroy?.(() => {});

    res.json({ message: 'Password has been reset' });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await User.findById(userId).select('+passwordHash +passwordResetTokenHash +passwordResetExpires');
    if (!user) {
      req.session?.destroy?.(() => {});
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const validCurrent = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validCurrent) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  me,
  validatePhone,
  validateCountryCode,
  requestPasswordReset,
  resetPassword,
  changePassword,
};
