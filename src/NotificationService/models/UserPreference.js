const mongoose = require('mongoose');
const config = require('../config/config');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserPreference:
 *       type: object
 *       required:
 *         - userId
 *       properties:
 *         userId:
 *           type: string
 *           description: ID of the user
 *           example: 507f1f77bcf86cd799439011
 *         email:
 *           type: boolean
 *           description: Whether to send email notifications
 *           default: false
 *           example: true
 *         push:
 *           type: boolean
 *           description: Whether to send push notifications
 *           default: false
 *           example: false
 *         inApp:
 *           type: boolean
 *           description: Whether to show in-app notifications
 *           default: true
 *           example: true
 *         emailFrequency:
 *           type: string
 *           description: Frequency of email notifications
 *           enum: [immediate, hourly, daily, weekly]
 *           default: daily
 *           example: daily
 *         notificationSettings:
 *           type: object
 *           description: Detailed notification preferences by type
 *           properties:
 *             urlCreation:
 *               type: object
 *               properties:
 *                 email: 
 *                   type: boolean
 *                   example: true
 *                 inApp: 
 *                   type: boolean
 *                   example: true
 *             milestones:
 *               type: object
 *               properties:
 *                 email: 
 *                   type: boolean
 *                   example: true
 *                 inApp: 
 *                   type: boolean
 *                   example: true
 *             system:
 *               type: object
 *               properties:
 *                 email: 
 *                   type: boolean
 *                   example: false
 *                 inApp: 
 *                   type: boolean
 *                   example: true
 */
const userPreferenceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: Boolean,
    default: config.notifications.defaultPreferences.email
  },
  push: {
    type: Boolean,
    default: config.notifications.defaultPreferences.push
  },
  inApp: {
    type: Boolean,
    default: config.notifications.defaultPreferences.inApp
  },
  emailFrequency: {
    type: String,
    enum: ['immediate', 'hourly', 'daily', 'weekly'],
    default: 'daily'
  },
  emailAddress: {
    type: String
  },
  deviceTokens: [{
    token: String,
    device: String,
    lastUsed: Date
  }],
  notificationSettings: {
    urlCreation: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      push: { type: Boolean, default: false }
    },
    milestones: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      push: { type: Boolean, default: false }
    },
    system: {
      email: { type: Boolean, default: false },
      inApp: { type: Boolean, default: true },
      push: { type: Boolean, default: false }
    }
  }
}, {
  timestamps: true
});

/**
 * Create default preference for a user
 * @param {string} userId - User ID
 * @param {string} emailAddress - User's email address
 * @returns {Promise<Object>} Created preference
 */
userPreferenceSchema.statics.createDefaultPreference = async function(userId, emailAddress) {
  return this.create({
    userId,
    emailAddress,
    email: config.notifications.defaultPreferences.email,
    push: config.notifications.defaultPreferences.push,
    inApp: config.notifications.defaultPreferences.inApp
  });
};

/**
 * Get preferences for a user, create default if not exists
 * @param {string} userId - User ID 
 * @param {string} emailAddress - User's email address (optional)
 * @returns {Promise<Object>} User preferences
 */
userPreferenceSchema.statics.getOrCreatePreference = async function(userId, emailAddress) {
  let preference = await this.findOne({ userId });
  
  if (!preference) {
    preference = await this.createDefaultPreference(userId, emailAddress);
  }
  
  return preference;
};

/**
 * Add a device token for push notifications
 * @param {string} userId - User ID
 * @param {string} token - Device token
 * @param {string} device - Device info
 * @returns {Promise<Object>} Updated preference
 */
userPreferenceSchema.statics.addDeviceToken = async function(userId, token, device) {
  const preference = await this.getOrCreatePreference(userId);
  
  // Remove token if it already exists
  preference.deviceTokens = preference.deviceTokens.filter(dt => dt.token !== token);
  
  // Add the new token
  preference.deviceTokens.push({
    token,
    device,
    lastUsed: new Date()
  });
  
  return preference.save();
};

/**
 * Remove a device token
 * @param {string} userId - User ID 
 * @param {string} token - Device token
 * @returns {Promise<Object>} Updated preference
 */
userPreferenceSchema.statics.removeDeviceToken = async function(userId, token) {
  return this.findOneAndUpdate(
    { userId },
    { $pull: { deviceTokens: { token } } },
    { new: true }
  );
};

const UserPreference = mongoose.model('UserPreference', userPreferenceSchema);

module.exports = UserPreference; 