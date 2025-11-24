const mongoose = require('mongoose');

async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGO_URI is required to connect to the database');
  }
  await mongoose.connect(uri);
  return mongoose.connection;
}

module.exports = connectDB;
