const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const config = require('./config');
const { createDb } = require('./db');
const { errorHandler, notFound } = require('./middleware/errorHandler');

async function main() {
  const app = express();

  await createDb();

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  app.use(cors({
    origin: config.CORS_ORIGIN === '*' ? '*' : config.CORS_ORIGIN.split(','),
    credentials: true,
  }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  });
  app.use('/api/', limiter);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many login attempts, please try again later' },
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  app.use(express.json({ limit: '1mb' }));

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/groups', require('./routes/groups'));
  app.use('/api/sessions', require('./routes/sessions'));
  app.use('/api/tasks', require('./routes/tasks'));
  app.use('/api/messages', require('./routes/messages'));
  app.use('/api/pomodoro', require('./routes/pomodoro'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/admin', require('./routes/admin'));

  if (config.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'index.html'));
      }
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  app.listen(config.PORT, () => {
    console.log(`StudySync server running on http://localhost:${config.PORT}`);
    console.log(`Environment: ${config.NODE_ENV}`);
  });
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
