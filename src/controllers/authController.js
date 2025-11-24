const bcrypt = require('bcrypt');
const User = require('../models/user');
const formatUser = require('../utils/formatUser');

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

    req.session.userId = user.id;

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

module.exports = {
  register,
  login,
  logout,
  me,
  validatePhone,
  validateCountryCode,
};
