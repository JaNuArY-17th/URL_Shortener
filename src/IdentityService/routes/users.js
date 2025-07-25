const express = require('express');
const router = express.Router();
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// Middleware to protect routes
const auth = passport.authenticate('jwt', { session: false });

// @route   GET api/users/me
// @desc    Get current user's profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT api/users/me
// @desc    Update current user's profile
// @access  Private
router.put(
  '/me',
  [
    auth,
    body('name', 'Name is required').optional().not().isEmpty(),
    body('email', 'Please include a valid email').optional().isEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

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
          return res.status(400).json({ message: 'Email already in use' });
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
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   PUT api/users/password
// @desc    Update user password
// @access  Private
router.put(
  '/password',
  [
    auth,
    body('currentPassword', 'Current password is required').not().isEmpty(),
    body('newPassword', 'New password must be at least 6 characters').isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      // Get user with password
      const user = await User.findById(req.user.id);

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);

      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router; 