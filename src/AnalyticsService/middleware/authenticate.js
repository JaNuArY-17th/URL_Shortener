const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../services/logger');

/**
 * Authentication middleware using JWT
 * Verifies JWT token and attaches user data to request
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.debug('Authentication failed: No Bearer token found');
    return res.status(401).json({
      status: 'error',
      message: 'Authentication required'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Set user info on request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (err) {
    logger.warn('Authentication failed: Invalid token', { error: err.message });
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expired'
      });
    }
    
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
};

/**
 * Middleware to authenticate optional - doesn't return error if no token
 * but attaches user data if token is valid
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateOptional = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  
  // If no token, continue without authentication
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Set user info on request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
  } catch (err) {
    // Just log the error but don't return an error response
    logger.debug('Optional authentication failed', { error: err.message });
  }
  
  next();
};

module.exports = { authenticate, authenticateOptional }; 