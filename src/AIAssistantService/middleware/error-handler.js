const logger = require('../services/logger');

/**
 * Global error handling middleware
 * Catches all unhandled errors and returns appropriate responses
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Unhandled error occurred', {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id
  });

  // Default error response
  let statusCode = 500;
  let errorResponse = {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorResponse = {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.message,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };
  } else if (err.name === 'CastError') {
    statusCode = 400;
    errorResponse = {
      error: 'Invalid data format',
      code: 'INVALID_FORMAT',
      details: err.message,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };
  } else if (err.name === 'MongoError' || err.name === 'MongooseError') {
    statusCode = 503;
    errorResponse = {
      error: 'Database error',
      code: 'DATABASE_ERROR',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorResponse = {
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorResponse = {
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    };
  } else if (err.statusCode || err.status) {
    // Handle errors with explicit status codes
    statusCode = err.statusCode || err.status;
    errorResponse.error = err.message || 'Request failed';
    errorResponse.code = err.code || 'REQUEST_FAILED';
  }

  // In development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;