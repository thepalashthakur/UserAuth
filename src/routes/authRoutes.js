const express = require('express');
const { register, login, logout, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const loginRateLimit = require('../middleware/loginRateLimit');

const router = express.Router();

router.post('/register', register);
router.post('/login', loginRateLimit, login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

module.exports = router;
