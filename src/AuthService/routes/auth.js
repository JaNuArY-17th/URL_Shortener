const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const { publishEvent } = require('../services/messagePublisher');
const config = require('../config/config');
const rateLimit = require('express-rate-limit');
const { 
  registerValidationRules, 
  loginValidationRules,
  forgotPasswordValidationRules,
  verifyOtpValidationRules,
  resetPasswordValidationRules,
  validate 
} = require('../middleware/validation');

// Rate limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: config.rateLimit.login.windowMs,
  max: config.rateLimit.login.max,
  message: {
    status: 'error',
    message: `Too many login attempts from this IP, please try again after ${Math.floor(config.rateLimit.login.windowMs / 60000)} minutes`
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for registration
const registerLimiter = rateLimit({
  windowMs: config.rateLimit.register.windowMs,
  max: config.rateLimit.register.max,
  message: {
    status: 'error',
    message: `Too many accounts created from this IP, please try again after ${Math.floor(config.rateLimit.register.windowMs / 60000)} minutes`
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for forgot password requests
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many password reset requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter for OTP verification
const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 verification attempts per windowMs
  message: {
    status: 'error',
    message: 'Too many OTP verification attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account and returns JWT token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password123!
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input or user already exists
 *       429:
 *         description: Too many registration attempts
 *       500:
 *         description: Server error
 */
router.post(
  '/register',
  registerLimiter,
  registerValidationRules,
  validate,
  async (req, res, next) => {
    const { name, email, password } = req.body;

    try {
      // Check if user exists
      let user = await User.findOne({ email });

      if (user) {
        const error = new Error('User already exists');
        error.statusCode = 400;
        return next(error);
      }

      // Create user
      user = new User({
        name,
        email,
        password
      });

      // Save user
      await user.save();

      // Create JWT payload
      const payload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };

      // Sign token
      const token = jwt.sign(
        payload,
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      // Publish user created event
      try {
        await publishEvent('UserCreatedEvent', {
          userId: user.id,
          name: user.name,
          email: user.email,
          timestamp: new Date().toISOString()
        });
      } catch (eventError) {
        console.error('Error publishing user created event:', eventError);
      }

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Error registering user:', error);
      if (!error.statusCode) {
        error.statusCode = 500;
        error.message = 'Server error';
      }
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticates a user and returns JWT token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid credentials or input
 *       429:
 *         description: Too many login attempts
 *       500:
 *         description: Server error
 */
router.post(
  '/login',
  loginLimiter,
  loginValidationRules,
  validate,
  async (req, res, next) => {
    const { email, password } = req.body;

    try {
      // Check if user exists
      const user = await User.findOne({ email });

      if (!user) {
        const error = new Error('Invalid credentials');
        error.statusCode = 400;
        return next(error);
      }

      // Verify password
      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        const error = new Error('Invalid credentials');
        error.statusCode = 400;
        return next(error);
      }

      // Create JWT payload
      const payload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };

      // Sign token
      const token = jwt.sign(
        payload,
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Error logging in:', error);
      if (!error.statusCode) {
        error.statusCode = 500;
        error.message = 'Server error';
      }
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/auth/validate:
 *   post:
 *     summary: Validate JWT token
 *     description: Validates a JWT token and returns user information
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid token
 *       500:
 *         description: Server error
 */
router.post('/validate', async (req, res, next) => {
  const { token } = req.body;
  
  if (!token) {
    const error = new Error('No token provided');
    error.statusCode = 401;
    return next(error);
  }
  
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 401;
      return next(error);
    }
    
    res.json({
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Token validation error:', error);
    const err = new Error('Invalid token');
    err.statusCode = 401;
    next(err);
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *             example:
 *               email: user@example.com
 *     responses:
 *       200:
 *         description: Password reset OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Password reset code sent to your email
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  forgotPasswordValidationRules,
  validate,
  async (req, res, next) => {
    try {
      const { email } = req.body;

      // Check if user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'No account found with this email address'
        });
      }

      // Generate 6-digit OTP
      const otpCode = PasswordReset.generateOTP();

      // Clean up any existing reset requests for this email
      await PasswordReset.deleteMany({ email });

      // Create new password reset request
      const passwordReset = new PasswordReset({
        email,
        otpCode
      });
      await passwordReset.save();

      // Publish event to send OTP email
      await publishEvent('password.reset.requested', {
        email,
        otpCode,
        userName: user.name,
        requestId: passwordReset._id.toString(),
        expiresAt: passwordReset.expiresAt
      });

      res.json({
        status: 'success',
        message: 'Password reset code sent to your email'
      });

    } catch (error) {
      console.error('Error in forgot password:', error);
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otpCode
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               otpCode:
 *                 type: string
 *                 description: 6-digit OTP code
 *             example:
 *               email: user@example.com
 *               otpCode: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.post(
  '/verify-otp',
  verifyOtpLimiter,
  verifyOtpValidationRules,
  validate,
  async (req, res, next) => {
    try {
      const { email, otpCode } = req.body;

      // Find valid reset request
      const passwordReset = await PasswordReset.findValidReset(email, otpCode);
      if (!passwordReset) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid or expired OTP code'
        });
      }

      // Mark OTP as verified
      passwordReset.verified = true;
      await passwordReset.save();

      res.json({
        status: 'success',
        message: 'OTP verified successfully'
      });

    } catch (error) {
      console.error('Error in verify OTP:', error);
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with verified OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otpCode
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               otpCode:
 *                 type: string
 *                 description: 6-digit verified OTP code
 *               password:
 *                 type: string
 *                 format: password
 *                 description: New password
 *             example:
 *               email: user@example.com
 *               otpCode: "123456"
 *               password: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Password reset successfully
 *       400:
 *         description: Invalid OTP or validation error
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post(
  '/reset-password',
  resetPasswordValidationRules,
  validate,
  async (req, res, next) => {
    try {
      const { email, otpCode, password } = req.body;

      // Find verified reset request
      const passwordReset = await PasswordReset.findOne({
        email,
        otpCode,
        verified: true,
        used: false,
        expiresAt: { $gt: new Date() }
      });

      if (!passwordReset) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid or expired reset request'
        });
      }

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      // Update user password
      user.password = password;
      await user.save();

      // Mark reset request as used
      passwordReset.used = true;
      await passwordReset.save();

      // Publish event for password reset notification
      await publishEvent('password.reset.completed', {
        email,
        userName: user.name,
        userId: user._id.toString(),
        resetAt: new Date()
      });

      res.json({
        status: 'success',
        message: 'Password reset successfully'
      });

    } catch (error) {
      console.error('Error in reset password:', error);
      next(error);
    }
  }
);

module.exports = router; 