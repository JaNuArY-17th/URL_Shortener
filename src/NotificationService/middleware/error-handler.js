const logger = require('../services/logger');

/**
 * Not Found middleware
 * Handles 404 errors for routes that don't exist
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Error handling middleware
 * Centralizes error handling logic
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorId = req.id || 'unknown';

  // Log error details
  if (statusCode >= 500) {
    logger.error(`[${errorId}] ${err.message}`, {
      stack: err.stack,
      path: req.path,
      method: req.method
    });
  } else {
    logger.warn(`[${errorId}] ${err.message}`, {
      path: req.path,
      method: req.method
    });
  }

  // Format error response based on status code
  let errorResponse = {
    status: 'error',
    message: err.message || 'Something went wrong'
  };

  // Add stack trace in development environment
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    errorResponse.stack = err.stack;
  }

  // For validation errors, include validation errors
  if (err.name === 'ValidationError') {
    errorResponse.errors = Object.values(err.errors).map(e => e.message);
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

module.exports = { notFoundHandler, errorHandler }; 