const express = require('express');
const { updateUser, getUserById, getCurrentUser } = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../../../middleware/auth');

const router = express.Router();

router.get('/me', requireAuth, getCurrentUser);
router.get('/:id', requireAuth, requireAdmin, getUserById);
router.patch('/:id', requireAuth, requireAdmin, updateUser);

module.exports = router;
