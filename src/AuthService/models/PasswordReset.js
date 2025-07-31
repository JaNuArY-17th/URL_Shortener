const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     PasswordReset:
 *       type: object
 *       required:
 *         - email
 *         - otpCode
 *         - expiresAt
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated MongoDB ID
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         otpCode:
 *           type: string
 *           description: 6-digit OTP code (hashed)
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: When the OTP expires
 *         verified:
 *           type: boolean
 *           default: false
 *           description: Whether the OTP has been verified
 *         used:
 *           type: boolean
 *           default: false
 *           description: Whether the reset has been completed
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date when reset request was created
 */
const PasswordResetSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  otpCode: {
    type: String,
    required: true,
    length: 6
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
  },
  verified: {
    type: Boolean,
    default: false
  },
  used: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for automatic cleanup of expired documents
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for faster email lookups
PasswordResetSchema.index({ email: 1 });

// Static method to generate 6-digit OTP
PasswordResetSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Static method to find valid reset request
PasswordResetSchema.statics.findValidReset = function(email, otpCode) {
  return this.findOne({
    email: email.toLowerCase(),
    otpCode,
    verified: false,
    used: false,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to cleanup expired requests
PasswordResetSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

module.exports = mongoose.model('PasswordReset', PasswordResetSchema);