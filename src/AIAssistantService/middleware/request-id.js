const { v4: uuidv4 } = require('uuid');

/**
 * Request ID middleware
 * Adds a unique request ID to each request for tracing
 */
const requestId = (req, res, next) => {
  // Check if request ID is already provided in headers
  const existingRequestId = req.get('X-Request-ID') || req.get('x-request-id');
  
  // Generate new request ID if not provided
  const requestId = existingRequestId || uuidv4();
  
  // Add to request object
  req.requestId = requestId;
  
  // Add to response headers
  res.set('X-Request-ID', requestId);
  
  next();
};

module.exports = requestId;