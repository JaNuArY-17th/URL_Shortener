const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     EmailVerification:
 *       type: object
 *       required:
 *         - email
 *         - otpCode
 *         - type
 *         - expiresAt
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated MongoDB ID
 *         email:
 *           type: string
 *           format: email
 *           description: Email address to verify
 *         otpCode:
 *           type: string
 *           description: 6-digit OTP code (hashed)
 *         type:
 *           type: string
 *           enum: [signup, email_change]
 *           description: Type of verification
 *         userId:
 *           type: string
 *           description: User ID (for email change verification)
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
 *           description: Whether the verification has been completed
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date when verification was created
 */
const EmailVerificationSchema = new mongoose.Schema({
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
  type: {
    type: String,
    required: true,
    enum: ['signup', 'email_change']
  },
  userId: {
    type: String,
    required: false // Only required for email_change type
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
EmailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for faster email lookups
EmailVerificationSchema.index({ email: 1, type: 1 });

// Static method to generate 6-digit OTP
EmailVerificationSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Static method to find valid verification
EmailVerificationSchema.statics.findValidVerification = function(email, otpCode, type) {
  return this.findOne({
    email: email.toLowerCase(),
    otpCode,
    type,
    verified: false,
    used: false,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to cleanup expired verifications
EmailVerificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

module.exports = mongoose.model('EmailVerification', EmailVerificationSchema);