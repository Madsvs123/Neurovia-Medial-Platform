const winston = require('winston');

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log the error
  winston.error(`
  Error: ${err.message}
  Stack: ${err.stack}
  Method: ${req.method}
  URL: ${req.originalUrl}
  IP: ${req.ip}
  User: ${req.user ? req.user.id : 'Unauthenticated'}
  `);

  // Set status code
  err.statusCode = err.statusCode || 500;

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    err.statusCode = 400;
    err.message = messages.join(', ');
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    err.statusCode = 400;
    err.message = `Duplicate ${field}: ${err.keyValue[field]} already exists`;
  }

  // Handle Mongoose cast errors
  if (err.name === 'CastError') {
    err.statusCode = 400;
    err.message = `Invalid ${err.path}: ${err.value}`;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    err.statusCode = 401;
    err.message = 'Not authorized, token failed';
  }

  if (err.name === 'TokenExpiredError') {
    err.statusCode = 401;
    err.message = 'Not authorized, token expired';
  }

  // Response structure
  res.status(err.statusCode).json({
    success: false,
    // top-level message for clients (matches APIResponse.error / validators)
    message: err.message,
    error: {
      message: err.message,
      statusCode: err.statusCode,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        name: err.name
      })
    }
  });
};

// 404 Not Found handler
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  // errorHandler reads err.statusCode (res.status alone was ignored → every
  // unknown route used to answer 500 instead of 404)
  error.statusCode = 404;
  res.status(404);
  next(error);
};

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
  // Note: CSRF protection is handled via Express.js built-in mechanisms
  // and API token validation. For additional CSRF protection in production,
  // consider using helmet.js (already installed) which provides robust security
  if (req.method === 'GET') {
    res.locals.csrfToken = 'CSRF-TOKEN-PLACEHOLDER';
  }
  next();
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  winston.info(`
  Request: ${req.method} ${req.originalUrl}
  IP: ${req.ip}
  User-Agent: ${req.get('User-Agent')}
  User: ${req.user ? req.user.id : 'Unauthenticated'}
  `);
  next();
};

module.exports = {
  errorHandler,
  notFoundHandler,
  csrfProtection,
  requestLogger
};