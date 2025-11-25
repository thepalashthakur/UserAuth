const express = require('express');
const {
  register,
  login,
  logout,
  me,
  requestPasswordReset,
  resetPassword,
  changePassword,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const loginRateLimit = require('../middleware/loginRateLimit');

const router = express.Router();

router.post('/register', register);
router.post('/login', loginRateLimit, login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.post('/password/change', requireAuth, changePassword);
router.post('/password-reset/request', requestPasswordReset);
router.post('/password-reset/confirm', resetPassword);

module.exports = router;
