const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to add a unique request ID to each request
 * This helps with tracing requests through logs
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const addRequestId = (req, res, next) => {
  // Use existing ID from header if present, otherwise generate a new one
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Attach to request object
  req.id = requestId;
  
  // Add to response headers
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

module.exports = addRequestId; 