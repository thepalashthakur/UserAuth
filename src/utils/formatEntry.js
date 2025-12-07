function formatEntry(entry) {
  return {
    id: entry.id,
    mood: entry.mood,
    note: entry.note,
    recordedAt: entry.recordedAt,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

module.exports = formatEntry;
