const path = require('path');

const NODE_ENV = process.env.NODE_ENV || 'development';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is required in production');
    process.exit(1);
  }
  console.warn('WARNING: JWT_SECRET not set. Using random ephemeral secret. Set JWT_SECRET in .env for persistence.');
}

module.exports = {
  JWT_SECRET: JWT_SECRET || require('crypto').randomBytes(64).toString('hex'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  PORT: parseInt(process.env.PORT, 10) || 4000,
  CORS_ORIGIN: process.env.CORS_ORIGIN || (NODE_ENV === 'production' ? 'http://localhost:4000' : '*'),
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'studysync.db'),
  NODE_ENV,
};
