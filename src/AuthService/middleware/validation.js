const { body, validationResult } = require('express-validator');

/**
 * Validate request based on rules
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.validationErrors = errors.array();
    return next(error);
  }
  next();
};

/**
 * Validation rules for registration
 */
const registerValidationRules = [
  body('name')
    .trim()
    .not().isEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

/**
 * Validation rules for login
 */
const loginValidationRules = [
  body('email')
    .trim()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .not().isEmpty().withMessage('Password is required')
];

/**
 * Validation rules for updating user profile
 */
const updateUserValidationRules = [
  body('name')
    .optional()
    .trim()
    .not().isEmpty().withMessage('Name cannot be empty if provided')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail()
];

/**
 * Validation rules for changing password
 */
const changePasswordValidationRules = [
  body('currentPassword')
    .not().isEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

module.exports = {
  validate,
  registerValidationRules,
  loginValidationRules,
  updateUserValidationRules,
  changePasswordValidationRules
}; 