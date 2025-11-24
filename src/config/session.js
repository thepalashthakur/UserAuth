const session = require('express-session');

const isProd = process.env.NODE_ENV === 'production';

module.exports = session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 2, // 2 hours
  },
});
