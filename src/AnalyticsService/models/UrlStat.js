const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     UrlStat:
 *       type: object
 *       required:
 *         - shortCode
 *         - originalUrl
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
 *         totalClicks:
 *           type: integer
 *           description: Total number of clicks
 *           example: 42
 *         uniqueVisitors:
 *           type: integer
 *           description: Number of unique visitors
 *           example: 24
 *         lastClickAt:
 *           type: string
 *           format: date-time
 *           description: Time of last click
 *           example: 2023-06-23T11:21:15.000Z
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Time when the URL was created
 *           example: 2023-06-23T11:21:15.000Z
 *         countryStats:
 *           type: object
 *           description: Click statistics by country
 *           example: {"US": 15, "GB": 10, "DE": 5, "other": 12}
 *         deviceStats:
 *           type: object
 *           description: Click statistics by device type
 *           example: {"desktop": 25, "mobile": 12, "tablet": 5}
 *         refererStats:
 *           type: object
 *           description: Click statistics by referer
 *           example: {"direct": 20, "google.com": 15, "facebook.com": 7}
 *         hourlyStats:
 *           type: object
 *           description: Click statistics by hour of day (0-23)
 *           example: {"0": 2, "1": 1, "12": 10, "13": 8, "18": 21}
 *         dailyStats:
 *           type: object
 *           description: Click statistics by day of week (0-6, Sunday-Saturday)
 *           example: {"0": 5, "1": 10, "2": 8, "3": 7, "4": 6, "5": 4, "6": 2}
 */
const urlStatSchema = new mongoose.Schema({
  shortCode: {
    type: String,
    required: true,
    unique: true,
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
  totalClicks: {
    type: Number,
    default: 0
  },
  uniqueVisitors: {
    type: Number,
    default: 0
  },
  lastClickAt: {
    type: Date
  },
  urlCreatedAt: {
    type: Date
  },
  countryStats: {
    type: Map,
    of: Number,
    default: {}
  },
  deviceStats: {
    type: Map,
    of: Number,
    default: {}
  },
  refererStats: {
    type: Map,
    of: Number,
    default: {}
  },
  hourlyStats: {
    type: Map,
    of: Number,
    default: {}
  },
  dailyStats: {
    type: Map,
    of: Number,
    default: {}
  },
  // Time series data stored in an array for performance
  // Each entry is [timestamp, clickCount]
  timeSeriesDaily: [{
    date: {
      type: Date,
      required: true
    },
    clicks: {
      type: Number,
      default: 0
    },
    uniqueVisitors: {
      type: Number,
      default: 0
    }
  }],
  // Tags or categories for this URL
  tags: [String]
}, {
  timestamps: true
});

// Indices for common queries
urlStatSchema.index({ userId: 1, totalClicks: -1 });
urlStatSchema.index({ totalClicks: -1 });
urlStatSchema.index({ createdAt: 1 });

/**
 * Increment click statistics for a URL
 * @param {string} shortCode - Short code of the URL
 * @param {Object} clickData - Click data
 * @returns {Promise<Object>} - Updated URL statistics
 */
urlStatSchema.statics.recordClick = async function(shortCode, clickData) {
  const now = new Date();
  const update = {
    $inc: { totalClicks: 1 },
    $set: { lastClickAt: now }
  };
  
  // Update device stats
  if (clickData.deviceType) {
    update.$inc[`deviceStats.${clickData.deviceType}`] = 1;
  }
  
  // Update country stats
  if (clickData.countryCode) {
    update.$inc[`countryStats.${clickData.countryCode}`] = 1;
  }
  
  // Update referer stats
  if (clickData.referer) {
    // Extract domain from referer
    try {
      const refererDomain = new URL(clickData.referer).hostname;
      update.$inc[`refererStats.${refererDomain}`] = 1;
    } catch (e) {
      update.$inc['refererStats.direct'] = 1;
    }
  } else {
    update.$inc['refererStats.direct'] = 1;
  }
  
  // Update hourly and daily stats
  const hour = now.getHours();
  const day = now.getDay();
  update.$inc[`hourlyStats.${hour}`] = 1;
  update.$inc[`dailyStats.${day}`] = 1;
  
  // Update time series data
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Check if we already have an entry for today
  const result = await this.findOneAndUpdate(
    { 
      shortCode, 
      'timeSeriesDaily.date': today 
    },
    {
      $inc: { 'timeSeriesDaily.$.clicks': 1 }
    }
  );
  
  if (!result) {
    // No entry for today, add a new one
    update.$push = {
      timeSeriesDaily: {
        date: today,
        clicks: 1,
        uniqueVisitors: 0 // Will be updated separately for unique visitors
      }
    };
  }
  
  // Update the document
  return this.findOneAndUpdate(
    { shortCode },
    update,
    { new: true, upsert: true }
  );
};

/**
 * Record a unique visitor
 * @param {string} shortCode - Short code of the URL
 * @param {string} visitorHash - Unique visitor hash
 * @returns {Promise<Object>} - Updated URL statistics
 */
urlStatSchema.statics.recordUniqueVisitor = async function(shortCode, visitorHash) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return this.findOneAndUpdate(
    { shortCode },
    {
      $inc: { uniqueVisitors: 1 },
      $inc: { 'timeSeriesDaily.$[elem].uniqueVisitors': 1 }
    },
    { 
      new: true,
      arrayFilters: [{ 'elem.date': today }]
    }
  );
};

const UrlStat = mongoose.model('UrlStat', urlStatSchema);

module.exports = UrlStat; 