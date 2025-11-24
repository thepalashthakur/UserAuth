const WINDOW_MS = 1 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 5 * 60 * 1000; // 5 minutes

// in-memory rate limiter keyed by IP + email (to avoid blocking all users behind one IP).
const attempts = new Map();

function buildKey(req) {
  const email = (req.body?.email || 'unknown').toString().toLowerCase().trim();
  return `${req.ip}:${email}`;
}

function loginRateLimit(req, res, next) {
  const key = buildKey(req);
  const now = Date.now();
  const entry = attempts.get(key) || { timestamps: [], blockUntil: 0 };

  if (entry.blockUntil && entry.blockUntil > now) {
    const retryAfterMs = entry.blockUntil - now;
    res.set('Retry-After', Math.ceil(retryAfterMs / 1000));
    return res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
    });
  }

  // Drop timestamps outside the rolling window.
  const recent = entry.timestamps.filter((ts) => now - ts < WINDOW_MS);
  recent.push(now);

  // Block on the attempt that exceeds the maximum within the window.
  if (recent.length > MAX_ATTEMPTS) {
    attempts.set(key, { timestamps: [], blockUntil: now + BLOCK_MS });
    res.set('Retry-After', Math.ceil(BLOCK_MS / 1000));
    return res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
    });
  }

  attempts.set(key, { timestamps: recent, blockUntil: 0 });
  next();
}

module.exports = loginRateLimit;
