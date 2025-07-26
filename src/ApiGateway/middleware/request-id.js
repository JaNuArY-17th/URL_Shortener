const { v4: uuidv4 } = require('uuid');

/**
 * Middleware thêm request ID vào mỗi request
 * @param {*} req - Express request
 * @param {*} res - Express response
 * @param {*} next - Next middleware
 */
const addRequestId = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.id = requestId;
  
  // Thêm request ID vào response headers
  res.setHeader('X-Request-ID', requestId);
  
  // Thêm request ID vào request headers để chuyển tiếp đến các service
  req.headers['x-request-id'] = requestId;
  
  next();
};

module.exports = addRequestId; 