const mongoose = require('mongoose');
const config = require('../config/config');

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       required:
 *         - title
 *         - message
 *       properties:
 *         userId:
 *           type: string
 *           description: ID of user receiving the notification
 *           example: 507f1f77bcf86cd799439011
 *         title:
 *           type: string
 *           description: Notification title
 *           example: URL Created Successfully
 *         message:
 *           type: string
 *           description: Notification message
 *           example: Your shortened URL abc123 has been created successfully
 *         type:
 *           type: string
 *           description: Type of notification
 *           enum: [info, success, warning, error, url, system]
 *           example: success
 *         read:
 *           type: boolean
 *           description: Whether the notification has been read
 *           default: false
 *           example: false
 *         data:
 *           type: object
 *           description: Additional data related to the notification
 *           example: {"shortCode": "abc123", "originalUrl": "https://example.com/very/long/url"}
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Notification creation timestamp
 *           example: 2023-06-23T11:21:15.000Z
 */
const notificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error', 'url', 'system'],
    default: 'info'
  },
  read: {
    type: Boolean,
    default: false
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  // For soft deletion
  deleted: {
    type: Boolean,
    default: false
  },
  // Methods used to deliver this notification
  deliveryStatus: {
    inApp: {
      delivered: { type: Boolean, default: true },
      timestamp: Date
    },
    email: {
      delivered: { type: Boolean, default: false },
      timestamp: Date
    },
    push: {
      delivered: { type: Boolean, default: false },
      timestamp: Date
    }
  }
}, {
  timestamps: true
});

// Indices for common queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ createdAt: 1 });

// TTL index to automatically delete old notifications after retention period
notificationSchema.index({ createdAt: 1 }, { 
  expireAfterSeconds: 60 * 60 * 24 * config.notifications.retention.days
});

/**
 * Mark notification as read
 * @returns {Promise} Updated notification
 */
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  return this.save();
};

/**
 * Mark notification as deleted (soft delete)
 * @returns {Promise} Updated notification
 */
notificationSchema.methods.markAsDeleted = function() {
  this.deleted = true;
  return this.save();
};

/**
 * Get unread notifications count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Number of unread notifications
 */
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, read: false, deleted: false });
};

/**
 * Create a URL creation notification
 * @param {string} userId - User ID
 * @param {string} shortCode - Short code for the URL
 * @param {string} originalUrl - Original URL
 * @returns {Promise<Object>} - Created notification
 */
notificationSchema.statics.createUrlCreatedNotification = async function(userId, shortCode, originalUrl) {
  return this.create({
    userId,
    title: 'URL Created Successfully',
    message: `Your shortened URL ${shortCode} has been created successfully.`,
    type: 'success',
    data: { shortCode, originalUrl },
    deliveryStatus: {
      inApp: { delivered: true, timestamp: new Date() }
    }
  });
};

/**
 * Create a milestone notification
 * @param {string} userId - User ID
 * @param {string} shortCode - Short code for the URL
 * @param {number} clicks - Number of clicks reached
 * @returns {Promise<Object>} - Created notification
 */
notificationSchema.statics.createMilestoneNotification = async function(userId, shortCode, clicks) {
  return this.create({
    userId,
    title: 'Click Milestone Reached',
    message: `Your shortened URL ${shortCode} has reached ${clicks} clicks!`,
    type: 'info',
    data: { shortCode, clicks },
    deliveryStatus: {
      inApp: { delivered: true, timestamp: new Date() }
    }
  });
};

/**
 * Create a system notification
 * @param {string} userId - User ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} data - Additional data
 * @returns {Promise<Object>} - Created notification
 */
notificationSchema.statics.createSystemNotification = async function(userId, title, message, data = {}) {
  return this.create({
    userId,
    title,
    message,
    type: 'system',
    data,
    deliveryStatus: {
      inApp: { delivered: true, timestamp: new Date() }
    }
  });
};

/**
 * Mark notifications as delivered by email
 * @param {Array} ids - Array of notification IDs
 * @returns {Promise} - Update result
 */
notificationSchema.statics.markAsEmailDelivered = function(ids) {
  return this.updateMany(
    { _id: { $in: ids } },
    { 
      $set: { 
        'deliveryStatus.email.delivered': true,
        'deliveryStatus.email.timestamp': new Date()
      } 
    }
  );
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 