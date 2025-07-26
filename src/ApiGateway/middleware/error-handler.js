const logger = require('../services/logger');

/**
 * Middleware xử lý lỗi 404 Not Found
 * @param {*} req - Express request
 * @param {*} res - Express response
 * @param {*} next - Next middleware
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Middleware xử lý lỗi chung
 * @param {*} err - Error object
 * @param {*} req - Express request
 * @param {*} res - Express response
 * @param {*} next - Next middleware
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const requestId = req.id || 'unknown';
  
  // Log lỗi với request ID
  if (statusCode >= 500) {
    logger.error(err.message, {
      stack: err.stack,
      statusCode,
      path: req.path,
      method: req.method,
      requestId
    });
  } else {
    logger.warn(err.message, {
      statusCode,
      path: req.path,
      method: req.method,
      requestId
    });
  }
  
  // Gửi response
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: err.message || 'Internal Server Error',
    requestId,
    timestamp: new Date().toISOString()
  });
};

module.exports = { notFoundHandler, errorHandler }; 