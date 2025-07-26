const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../services/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Middleware xác thực JWT token
 * Sẽ thêm thông tin người dùng vào req.user nếu token hợp lệ
 * @param {*} req - Express request
 * @param {*} res - Express response
 * @param {*} next - Next middleware
 */
const authenticate = (req, res, next) => {
  // Kiểm tra có token không
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // Không có token, tiếp tục
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Xác thực token
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });
    
    // Lưu thông tin người dùng vào request
    req.user = decoded;
    
    // Thêm thông tin người dùng vào headers để chuyển tiếp đến các service khác
    req.headers['X-User-Id'] = decoded.sub || decoded.userId || '';
    req.headers['X-User-Role'] = decoded.role || '';
    req.headers['X-User-Email'] = decoded.email || '';
    
    logger.debug('User authenticated', { userId: req.headers['X-User-Id'], requestId: req.id });
  } catch (error) {
    logger.warn('Authentication failed', { error: error.message, requestId: req.id || uuidv4() });
    // Không trả lỗi ngay, chỉ không thêm req.user
  }
  
  next();
};

module.exports = authenticate; 