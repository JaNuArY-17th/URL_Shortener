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

/**
 * Middleware to check if the user is the owner of a URL
 * Must be used after authenticate middleware
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object 
 * @param {Function} next - Express next function
 */
const isUrlOwner = async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const userId = req.user?.id;
    
    // If no user or no shortCode, cannot verify ownership
    if (!userId || !shortCode) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    // Get URL from database
    const Url = require('../models/Url');
    const url = await Url.findOne({ shortCode });
    
    // If URL not found
    if (!url) {
      return res.status(404).json({
        status: 'error',
        message: `URL with short code ${shortCode} not found`
      });
    }
    
    // If URL has no owner or is owned by current user
    if (!url.userId || url.userId.toString() === userId.toString()) {
      // URL either has no owner or is owned by current user
      req.url = url; // Attach URL to request for later use
      return next();
    }
    
    // Not authorized - URL belongs to another user
    return res.status(403).json({
      status: 'error',
      message: 'You are not authorized to access this URL'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { authenticate, authenticateOptional, isUrlOwner }; 