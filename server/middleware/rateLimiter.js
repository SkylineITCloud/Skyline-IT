const rateLimit = require('express-rate-limit');

const standard = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const strict = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const api = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'API rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const admin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Admin rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const auth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again later' },
});

module.exports = { standard, strict, api, admin, auth };
