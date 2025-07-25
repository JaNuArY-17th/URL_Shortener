const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     ClickEvent:
 *       type: object
 *       required:
 *         - shortCode
 *         - timestamp
 *       properties:
 *         shortCode:
 *           type: string
 *           description: Short code of the URL
 *           example: abc123
 *         originalUrl:
 *           type: string
 *           description: Original URL
 *           example: https://example.com/very/long/url
 *         userId:
 *           type: string
 *           description: ID of the user who created the URL
 *           example: 507f1f77bcf86cd799439011
 *         visitorHash:
 *           type: string
 *           description: Hashed identifier of the visitor
 *           example: 7daf6c79d4802916d83f6266e370b7bf9b5a1f33351e35c713d2d73a1b7201a3
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Time when the click occurred
 *           example: 2023-06-23T11:21:15.000Z
 *         ipHash:
 *           type: string
 *           description: Hashed IP address of the visitor
 *           example: 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
 *         userAgent:
 *           type: string
 *           description: User agent of the visitor
 *           example: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
 *         referer:
 *           type: string
 *           description: Referer URL
 *           example: https://google.com
 *         countryCode:
 *           type: string
 *           description: Country code of the visitor
 *           example: US
 *         deviceType:
 *           type: string
 *           description: Type of device
 *           enum: [desktop, mobile, tablet, unknown]
 *           example: desktop
 */
const clickEventSchema = new mongoose.Schema({
  shortCode: {
    type: String,
    required: true,
    index: true
  },
  originalUrl: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    index: true
  },
  visitorHash: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  ipHash: {
    type: String
  },
  userAgent: {
    type: String
  },
  referer: {
    type: String
  },
  countryCode: {
    type: String,
    index: true
  },
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indices for common queries
clickEventSchema.index({ shortCode: 1, timestamp: -1 });
clickEventSchema.index({ timestamp: -1 });
clickEventSchema.index({ userId: 1, timestamp: -1 });

// TTL index to automatically delete old records after retention period (default: 365 days)
clickEventSchema.index({ createdAt: 1 }, { 
  expireAfterSeconds: 60 * 60 * 24 * process.env.DATA_RETENTION_DAYS || 60 * 60 * 24 * 365 
});

/**
 * Get click events for a short code within a time range
 * @param {string} shortCode - Short code of the URL
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} - Array of click events
 */
clickEventSchema.statics.getClicksForUrl = function(shortCode, startDate, endDate) {
  return this.find({
    shortCode,
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ timestamp: -1 });
};

/**
 * Get unique visitor count for a short code within a time range
 * @param {string} shortCode - Short code of the URL
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<number>} - Number of unique visitors
 */
clickEventSchema.statics.getUniqueVisitorsCount = function(shortCode, startDate, endDate) {
  return this.distinct('visitorHash', {
    shortCode,
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  }).then(visitors => visitors.length);
};

/**
 * Detect device type from user agent
 * @param {string} userAgent - User agent string
 * @returns {string} - Device type: 'desktop', 'mobile', 'tablet', or 'unknown'
 */
clickEventSchema.statics.detectDeviceType = function(userAgent) {
  if (!userAgent) return 'unknown';
  
  userAgent = userAgent.toLowerCase();
  
  if (userAgent.match(/mobile/i)) {
    if (userAgent.match(/tablet|ipad/i)) {
      return 'tablet';
    }
    return 'mobile';
  } else if (userAgent.match(/tablet|ipad/i)) {
    return 'tablet';
  } else if (userAgent.match(/windows|macintosh|linux/i)) {
    return 'desktop';
  }
  
  return 'unknown';
};

const ClickEvent = mongoose.model('ClickEvent', clickEventSchema);

module.exports = ClickEvent; 