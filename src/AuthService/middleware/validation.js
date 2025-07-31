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
 * Password complexity validation
 */
const passwordComplexityRules = [
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character')
];

/**
 * Validation rules for registration (step 1 - send OTP)
 */
const registerValidationRules = [
  body('name')
    .trim()
    .not().isEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail({ gmail_remove_dots: false }),
  ...passwordComplexityRules
];

/**
 * Validation rules for email verification during signup
 */
const verifySignupEmailValidationRules = [
  body('name')
    .trim()
    .not().isEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),
  body('otpCode')
    .isLength({ min: 6, max: 6 }).withMessage('OTP code must be 6 digits')
    .isNumeric().withMessage('OTP code must contain only numbers')
];

/**
 * Validation rules for login
 */
const loginValidationRules = [
  body('email')
    .trim()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail({ gmail_remove_dots: false }),
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
    .normalizeEmail({ gmail_remove_dots: false })
];

/**
 * Validation rules for changing password
 */
const changePasswordValidationRules = [
  body('currentPassword')
    .not().isEmpty().withMessage('Current password is required'),
  ...passwordComplexityRules.map(rule => rule.withMessage('New password ' + rule.message))
];

/**
 * Validation rules for forgot password request
 */
const forgotPasswordValidationRules = [
  body('email')
    .trim()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail({ gmail_remove_dots: false })
];

/**
 * Validation rules for OTP verification
 */
const verifyOtpValidationRules = [
  body('email')
    .trim()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('otpCode')
    .isLength({ min: 6, max: 6 }).withMessage('OTP code must be 6 digits')
    .isNumeric().withMessage('OTP code must contain only numbers')
];

/**
 * Validation rules for reset password
 */
const resetPasswordValidationRules = [
  body('email')
    .trim()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('otpCode')
    .isLength({ min: 6, max: 6 }).withMessage('OTP code must be 6 digits')
    .isNumeric().withMessage('OTP code must contain only numbers'),
  ...passwordComplexityRules
];

/**
 * Validation rules for email change verification
 */
const verifyEmailChangeValidationRules = [
  body('email')
    .trim()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail({ gmail_remove_dots: false }),
  body('otpCode')
    .isLength({ min: 6, max: 6 }).withMessage('OTP code must be 6 digits')
    .isNumeric().withMessage('OTP code must contain only numbers')
];

/**
 * Validation rules for requesting email change OTP
 */
const requestEmailChangeValidationRules = [
  body('email')
    .trim()
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail({ gmail_remove_dots: false })
];

module.exports = {
  validate,
  registerValidationRules,
  verifySignupEmailValidationRules,
  loginValidationRules,
  updateUserValidationRules,
  changePasswordValidationRules,
  passwordComplexityRules,
  forgotPasswordValidationRules,
  verifyOtpValidationRules,
  resetPasswordValidationRules,
  verifyEmailChangeValidationRules,
  requestEmailChangeValidationRules
}; 