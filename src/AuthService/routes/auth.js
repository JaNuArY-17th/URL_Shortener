const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { publishEvent } = require('../services/messagePublisher');
const config = require('../config/config');
const rateLimit = require('express-rate-limit');
const { 
  registerValidationRules, 
  loginValidationRules, 
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

module.exports = router; 