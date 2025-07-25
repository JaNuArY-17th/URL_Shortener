const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to add unique request ID to each request
 * This helps with tracing requests through logs and across services
 */
const addRequestId = (req, res, next) => {
  // Generate a unique ID for this request if not already set
  req.id = req.id || uuidv4();
  
  // Add as response header so the client can track request
  res.setHeader('X-Request-ID', req.id);
  
  next();
};

module.exports = addRequestId; 