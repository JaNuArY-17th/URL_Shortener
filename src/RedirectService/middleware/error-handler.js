const logger = require('../services/logger');

/**
 * Not found handler middleware
 * Handles 404 errors when a route is not found
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Error handler middleware
 * Centralizes error handling and logging
 */
const errorHandler = (err, req, res, next) => {
  // Extract and normalize status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Log based on severity
  if (statusCode >= 500) {
    logger.error({
      message: err.message,
      stack: err.stack,
      requestId: req.id,
      path: req.path,
      method: req.method,
      // Include additional context for internal errors
      query: req.query,
      body: statusCode === 500 ? 'REDACTED' : req.body,
    });
  } else {
    logger.warn({
      message: err.message,
      statusCode,
      requestId: req.id,
      path: req.path,
      method: req.method
    });
  }

  // Structure the error response based on environment
  const errorResponse = {
    status: 'error',
    message: statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error' 
      : err.message
  };

  // Include validation errors if present (for 400 responses)
  if (err.validationErrors && statusCode === 400) {
    errorResponse.validationErrors = err.validationErrors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    errorResponse.stack = err.stack;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

module.exports = {
  notFoundHandler,
  errorHandler
}; 