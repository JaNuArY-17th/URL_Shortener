const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../services/logger');

/**
 * JWT Authentication middleware
 * Validates JWT tokens and extracts user information
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. Invalid token format.',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }

    // Verify the token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Add user info to request object
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user',
      name: decoded.name
    };

    // Add token info for logging
    req.tokenInfo = {
      iat: decoded.iat,
      exp: decoded.exp,
      iss: decoded.iss
    };

    logger.debug('User authenticated successfully', {
      userId: req.user.id,
      role: req.user.role,
      requestId: req.requestId
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error.message,
      requestId: req.requestId,
      ip: req.ip
    });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token has expired.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }

    return res.status(401).json({ 
      error: 'Authentication failed.',
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * Optional authentication middleware
 * Extracts user info if token is present, but doesn't require it
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user',
      name: decoded.name
    };

    next();
  } catch (error) {
    // For optional auth, we just continue without user info
    logger.debug('Optional authentication failed, continuing without user', {
      error: error.message,
      requestId: req.requestId
    });
    next();
  }
};

/**
 * Role-based authorization middleware
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      logger.warn('Access denied - insufficient permissions', {
        userId: req.user.id,
        userRole,
        requiredRoles: allowedRoles,
        requestId: req.requestId
      });

      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  requireRole
};