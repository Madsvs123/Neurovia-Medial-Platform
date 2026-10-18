/**
 * Centralised application configuration.
 *
 * This module was missing from the repository even though `server.js` and
 * `utils/emailService.js` require it — meaning the API could not boot at
 * all. It now:
 *   1. Loads `.env` (the project previously declared `dotenv`/`dotenv-safe`
 *      as dependencies but never actually loaded them anywhere).
 *   2. Exposes a single, typed `config` object.
 *   3. Exposes `validateConfig()` which fails fast in production when
 *      required secrets are missing, and only warns in development so local
 *      setup stays easy.
 */
const path = require('path');

// Load environment variables from backend/.env (no-op if the file is absent,
// e.g. when real environment variables are injected by the host/CI).
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const toInt = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const toList = (value, fallback) =>
  (value ? value.split(',').map((v) => v.trim()).filter(Boolean) : fallback);

const env = process.env.NODE_ENV || 'development';

const config = {
  server: {
    env,
    port: toInt(process.env.PORT, 5000),
    baseUrl: process.env.SERVER_BASE_URL || process.env.CLIENT_URL || 'http://localhost:5173',
  },

  database: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/neurovia_db',
    dbName: process.env.MONGODB_DB_NAME || undefined,
    options: {
      serverSelectionTimeoutMS: toInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS, 10000),
    },
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_insecure_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  security: {
    cors: {
      // Comma-separated list in ALLOWED_ORIGINS, e.g.
      // "http://localhost:3000,http://localhost:5173"
      allowedOrigins: toList(process.env.ALLOWED_ORIGINS, [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5000',
      ]),
    },
    rateLimiting: {
      // Generous default: standard REST usage (CRUD pages, forms, etc).
      windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      max: toInt(process.env.RATE_LIMIT_MAX, 600),
    },
    // A second, looser limiter dedicated to the polling-heavy conversation /
    // notification endpoints (see server.js). These are hit every few
    // seconds per open tab (messages, unread counts, conversation lists),
    // so they need a much higher ceiling than regular CRUD traffic.
    pollingRateLimiting: {
      windowMs: toInt(process.env.POLLING_RATE_LIMIT_WINDOW_MS, 60 * 1000),
      max: toInt(process.env.POLLING_RATE_LIMIT_MAX, 240),
    },
  },

  uploads: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: process.env.MAX_FILE_SIZE || '5mb',
    maxVideoSize: process.env.MAX_VIDEO_SIZE || '500mb',
  },

  email: {
    service: process.env.EMAIL_SERVICE || undefined,
    host: process.env.EMAIL_HOST || undefined,
    port: toInt(process.env.EMAIL_PORT, 587),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || undefined,
      pass: process.env.EMAIL_PASSWORD || undefined,
    },
    from: process.env.EMAIL_FROM || 'Neurovia <no-reply@neurovia.app>',
  },
};

/**
 * Fail fast on missing required configuration.
 * - In production, a missing JWT secret or DB URI is fatal.
 * - In development/test, we only warn so the app stays easy to boot locally.
 */
function validateConfig() {
  const problems = [];

  if (!process.env.JWT_SECRET) {
    problems.push('JWT_SECRET is not set — using an insecure development default.');
  }
  if (!process.env.MONGODB_URI) {
    problems.push(`MONGODB_URI is not set — defaulting to ${config.database.uri}.`);
  }

  if (problems.length === 0) return;

  if (config.server.env === 'production') {
     
    console.error('Invalid configuration for production:\n' + problems.join('\n'));
    throw new Error('Missing required production configuration. See logs above.');
  }

   
  problems.forEach((p) => console.warn(`[config] ${p}`));
}

module.exports = { config, validateConfig };
