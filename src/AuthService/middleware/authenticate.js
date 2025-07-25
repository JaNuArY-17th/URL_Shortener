const passport = require('passport');

/**
 * Authentication middleware using Passport JWT
 * @param {string} [role] - Optional role to check
 * @returns {function} Express middleware function
 */
const authenticate = (role) => (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Unauthorized: Authentication required',
        error: info ? info.message : 'Invalid or expired token'
      });
    }

    // Check role if required
    if (role && user.role !== role) {
      return res.status(403).json({
        message: 'Forbidden: Insufficient permissions',
        error: `Role "${role}" is required to access this resource`
      });
    }

    // Add user to request
    req.user = user;
    next();
  })(req, res, next);
};

/**
 * Check if user is authenticated (but don't require it)
 */
const optionalAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
};

module.exports = {
  authenticate,
  optionalAuth,
  // Shortcuts for specific roles
  authenticateUser: authenticate('user'),
  authenticateAdmin: authenticate('admin')
}; 