const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/user');
const formatUser = require('../utils/formatUser');
const { validatePhone, validateCountryCode } = require('./authController');

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const { email, password, displayName, name, phoneNumber, countryCode, role } = req.body || {};
    const update = {};

    if (email) {
      update.email = email.toLowerCase().trim();
    }

    if (displayName !== undefined) {
      update.displayName = String(displayName).trim();
    }

    if (name !== undefined) {
      update.name = String(name).trim();
    }

    if (role !== undefined) {
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      update.role = role;
    }

    if (phoneNumber !== undefined) {
      const cleanedPhone = String(phoneNumber).trim();
      if (!validatePhone(cleanedPhone)) {
        return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
      }
      if (countryCode === undefined) {
        return res.status(400).json({ error: 'Country code is required when updating phone number' });
      }
      update.phoneNumber = cleanedPhone;
    }

    if (countryCode !== undefined) {
      const cleanedCountry = String(countryCode).trim();
      if (!validateCountryCode(cleanedCountry)) {
        return res.status(400).json({ error: 'Country code must be 1-4 digits and may start with +' });
      }
      update.countryCode = cleanedCountry;
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      update.passwordHash = await bcrypt.hash(password, 10);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    const updatedUser = await User.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: formatUser(updatedUser),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Email or phone already in use' });
    }
    next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(formatUser(user));
  } catch (err) {
    next(err);
  }
}

function getCurrentUser(req, res) {
  res.json(formatUser(req.user));
}

module.exports = {
  updateUser,
  getUserById,
  getCurrentUser,
};
