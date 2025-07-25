const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/authenticate');
const { 
  updateUserValidationRules, 
  changePasswordValidationRules,
  validate 
} = require('../middleware/validation');

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user's profile
 *     description: Returns the profile of the currently authenticated user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.get('/me', authenticate(), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    const err = new Error('Error fetching user profile');
    err.statusCode = 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update current user's profile
 *     description: Update name or email of the currently authenticated user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: User profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input or email already in use
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.put(
  '/me',
  authenticate(),
  updateUserValidationRules,
  validate,
  async (req, res, next) => {
    const { name, email } = req.body;
    const updateFields = {};
    
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    updateFields.updatedAt = Date.now();

    try {
      // Check if email already exists
      if (email) {
        const existingUser = await User.findOne({ email });
        if (existingUser && existingUser.id !== req.user.id) {
          const error = new Error('Email already in use');
          error.statusCode = 400;
          return next(error);
        }
      }

      // Update user
      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateFields },
        { new: true }
      ).select('-password');

      res.json(user);
    } catch (error) {
      console.error('Error updating user:', error);
      const err = new Error('Error updating user profile');
      err.statusCode = 500;
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/users/password:
 *   put:
 *     summary: Update user password
 *     description: Update password of the currently authenticated user
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Invalid input or current password is incorrect
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error
 */
router.put(
  '/password',
  authenticate(),
  changePasswordValidationRules,
  validate,
  async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    try {
      // Get user with password
      const user = await User.findById(req.user.id);

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);

      if (!isMatch) {
        const error = new Error('Current password is incorrect');
        error.statusCode = 400;
        return next(error);
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error updating password:', error);
      const err = new Error('Error updating password');
      err.statusCode = 500;
      next(err);
    }
  }
);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (admin only)
 *     description: Returns a list of all users (admin access only)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of users to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pages:
 *                   type: integer
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get('/', authenticate('admin'), async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const total = await User.countDocuments();
    const users = await User.find()
      .select('-password')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    res.json({
      users,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    const err = new Error('Error fetching users');
    err.statusCode = 500;
    next(err);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID (admin only)
 *     description: Returns a specific user by ID (admin access only)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticate('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      return next(error);
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    const err = new Error('Error fetching user');
    err.statusCode = 500;
    next(err);
  }
});

module.exports = router; 