const mongoose = require('mongoose');
const { ALLOWED_MOODS } = require('../constants/moods');

const entrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mood: {
      type: String,
      required: true,
      trim: true,
      enum: ALLOWED_MOODS,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Faster owner scoping queries.
entrySchema.index({ user: 1, recordedAt: -1 });

module.exports = mongoose.model('Entry', entrySchema, 'moods');
