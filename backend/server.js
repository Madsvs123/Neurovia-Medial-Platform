// Load configuration first
const { config, validateConfig } = require('./config/config');

// Validate required configuration
validateConfig();

// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const app = express();

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Configure Winston logger
const defaultTransports = [
  new winston.transports.Console(),
  new DailyRotateFile({
    filename: path.join(__dirname, 'logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d'
  }),
  new DailyRotateFile({
    filename: path.join(__dirname, 'logs', 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d'
  })
];

const exceptionHandlers = [
  new DailyRotateFile({
    filename: path.join(__dirname, 'logs', 'exceptions-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d'
  })
];

const rejectionHandlers = [
  new DailyRotateFile({
    filename: path.join(__dirname, 'logs', 'rejections-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d'
  })
];

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: defaultTransports,
  exceptionHandlers,
  rejectionHandlers
});

// Ensure the default/global winston logger has transports too so other modules
// that call `winston.info()` will not attempt to write with no transports.
winston.configure({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: defaultTransports,
  exceptionHandlers,
  rejectionHandlers
});

// Middleware
// Security headers
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: config.security.cors.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-requested-with']
};
app.use(cors(corsOptions));

// Rate limiting
// The conversation/notification endpoints are polled every few seconds per
// open tab (messages, unread counts, conversation lists). Under the default
// limiter that traffic alone blew through the window in minutes and started
// returning 429s during normal use, so polling-heavy routes get their own,
// much looser limiter. Everything else keeps the stricter default.
const limiter = rateLimit({
  windowMs: config.security.rateLimiting.windowMs,
  max: config.security.rateLimiting.max,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

const pollingLimiter = rateLimit({
  windowMs: config.security.pollingRateLimiting.windowMs,
  max: config.security.pollingRateLimiting.max,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

app.use(['/api/v2/messaging', '/api/notifications'], pollingLimiter);
app.use(limiter);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// Sanitize data
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Compression
app.use(compression());

// Request logging
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// File uploads (general)
const { upload, videoUpload } = require('./middleware/uploadMiddleware');
app.post('/api/uploads', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.json({
    success: true,
    file: req.file
  });
});

// Video uploads (separate endpoint with larger limit)
app.post('/api/uploads/video', videoUpload.single('video'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No video uploaded' });
  }
  res.json({
    success: true,
    file: req.file
  });
});

console.log('Starting Neurovia API server...');
console.log('Environment:', config.server.env);

// Database connection with enhanced options
mongoose.connect(config.database.uri, {
  dbName: config.database.dbName,
  ...config.database.options
})
.then(() => {
  console.log('Connected to MongoDB');
  winston.info('Successfully connected to MongoDB');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  winston.error(`MongoDB connection error: ${err.message}`);
  console.error('MongoDB connection error:', err.message);
  console.log('Server will continue running. Please check your MongoDB connection.');
});

// Routes
const userRoutes = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');
const courseRoutes = require('./routes/courseRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const quizRoutes = require('./routes/quizRoutes');
const flashcardRoutes = require('./routes/flashcardRoutes');
const clinicalCaseRoutes = require('./routes/clinicalCaseRoutes');
const programRoutes = require('./routes/programRoutes');
const programEnrollmentRoutes = require('./routes/programEnrollmentRoutes');
const programResourceRoutes = require('./routes/programResourceRoutes');
const subscriptionPlanRoutes = require('./routes/subscriptionPlanRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const diseaseRoutes = require('./routes/diseaseRoutes');
const medicationRoutes = require('./routes/medicationRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const doctorToolRoutes = require('./routes/doctorToolRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const messagingRoutes = require('./modules/messaging/routes');

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Neurovia API - AI-Powered Medical Education Platform' });
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/clinical-cases', clinicalCaseRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/subscription-plans', subscriptionPlanRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/diseases', diseaseRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/doctor-tools', doctorToolRoutes);
app.use('/api/program-enrollments', programEnrollmentRoutes);
app.use('/api/program-resources', programResourceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/activity-logs', activityLogRoutes);
// Messaging v2 (threads, messages, queue, templates). The old
// /api/conversations + /api/messages surface was removed — see
// scripts/migrateConversationsToThreads.js for the data migration.
app.use('/api/v2/messaging', messagingRoutes);

// Import middleware
const { errorHandler, notFoundHandler, requestLogger } = require('./middleware/errorMiddleware');

// Request logging
app.use(requestLogger);

// 404 Not Found handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = config.server.port;
const server = app.listen(PORT, () => {
  console.log(`🚀 Neurovia API Server running in ${config.server.env} mode on port ${PORT}`);
  winston.info(`Server started in ${config.server.env} mode on port ${PORT}`);
});

// Real-time layer for conversations/notifications. Falls back gracefully —
// all conversation/notification data also loads via plain REST polling, so a
// client that can't establish a socket (or a dropped connection) still works.
const { initSocket } = require('./realtime/socket');
initSocket(server, { jwtSecret: config.jwt.secret });

// Domain-event subscribers (in-app notifications) and the SLA/auto-close job.
require('./modules/notifications/messagingSubscriber').subscribe();
if (config.server.env !== 'test') {
  require('./modules/messaging/services/slaService').start();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  winston.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  winston.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  winston.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    winston.info('Server closed');
    process.exit(0);
  });
});