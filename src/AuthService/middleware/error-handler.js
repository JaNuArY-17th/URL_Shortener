const config = require('../config/config');
const logger = require('../services/logger');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    requestId: req.id
  });

  // Default error status and message
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Custom error response based on error type
  let errorResponse = {
    status: 'error',
    message
  };

  // Add stack trace in development mode
  if (config.server.nodeEnv === 'development') {
    errorResponse.stack = err.stack;
  }

  // Add validation errors if available
  if (err.validationErrors) {
    errorResponse.errors = err.validationErrors;
  }

  res.status(status).json(errorResponse);
};

/**
 * 404 Not Found middleware
 */
const notFoundHandler = (req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    status: 'error',
    message: `Not Found - ${req.originalUrl}`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
}; 