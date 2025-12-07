const express = require('express');
const {
  createEntry,
  listEntries,
  getEntry,
  updateEntry,
  deleteEntry,
  listAllowedMoods,
} = require('../controllers/entryController');
const { requireAuth } = require('../../../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/moods', listAllowedMoods);
router.get('/', listEntries);
router.post('/', createEntry);
router.get('/:id', getEntry);
router.patch('/:id', updateEntry);
router.delete('/:id', deleteEntry);

module.exports = router;
