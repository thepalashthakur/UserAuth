const mongoose = require('mongoose');
const Entry = require('../../../models/entry');
const formatEntry = require('../../../utils/formatEntry');
const { ALLOWED_MOODS } = require('../../../constants/moods');

function parseRecordedAt(recordedAt) {
  if (recordedAt === undefined) {
    return undefined;
  }
  const parsed = new Date(recordedAt);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function normalizeMood(value) {
  if (value === undefined || value === null) return null;
  const trimmed = value.toString().trim();
  if (!trimmed) return null;
  const match = ALLOWED_MOODS.find((allowed) => allowed.toLowerCase() === trimmed.toLowerCase());
  return match || null;
}

async function createEntry(req, res, next) {
  try {
    const userId = req.user?.id;
    const { mood, note, recordedAt } = req.body || {};

    const normalizedMood = normalizeMood(mood);
    if (!normalizedMood) {
      return res
        .status(400)
        .json({ error: `Mood is required and must be one of: ${ALLOWED_MOODS.join(', ')}` });
    }

    const parsedRecordedAt = parseRecordedAt(recordedAt);
    if (parsedRecordedAt === null) {
      return res.status(400).json({ error: 'recordedAt must be a valid date' });
    }

    const entry = await Entry.create({
      user: userId,
      mood: normalizedMood,
      note: note !== undefined ? note.toString().trim() : undefined,
      recordedAt: parsedRecordedAt,
    });

    res.status(201).json(formatEntry(entry));
  } catch (err) {
    next(err);
  }
}

async function listEntries(req, res, next) {
  try {
    const entries = await Entry.find({ user: req.user?.id }).sort({ recordedAt: -1, createdAt: -1 });
    res.json(entries.map(formatEntry));
  } catch (err) {
    next(err);
  }
}

async function getEntry(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid entry id' });
    }

    const entry = await Entry.findOne({ _id: id, user: req.user?.id });
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(formatEntry(entry));
  } catch (err) {
    next(err);
  }
}

async function updateEntry(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid entry id' });
    }

    const { mood, note, recordedAt } = req.body || {};
    const update = {};

    if (mood !== undefined) {
      const normalizedMood = normalizeMood(mood);
      if (!normalizedMood) {
        return res
          .status(400)
          .json({ error: `Mood must be one of: ${ALLOWED_MOODS.join(', ')}` });
      }
      update.mood = normalizedMood;
    }

    if (note !== undefined) {
      update.note = note.toString().trim();
    }

    if (recordedAt !== undefined) {
      const parsedRecordedAt = parseRecordedAt(recordedAt);
      if (parsedRecordedAt === null) {
        return res.status(400).json({ error: 'recordedAt must be a valid date' });
      }
      update.recordedAt = parsedRecordedAt;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    const updatedEntry = await Entry.findOneAndUpdate({ _id: id, user: req.user?.id }, update, {
      new: true,
      runValidators: true,
    });

    if (!updatedEntry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(formatEntry(updatedEntry));
  } catch (err) {
    next(err);
  }
}

async function deleteEntry(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid entry id' });
    }

    const deleted = await Entry.findOneAndDelete({ _id: id, user: req.user?.id });
    if (!deleted) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ message: `Deletion for entry id ${id} success` });
  } catch (err) {
    next(err);
  }
}

function listAllowedMoods(_req, res) {
  res.json({ moods: ALLOWED_MOODS });
}

module.exports = {
  createEntry,
  listEntries,
  getEntry,
  updateEntry,
  deleteEntry,
  listAllowedMoods,
};
