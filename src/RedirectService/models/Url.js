const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Url:
 *       type: object
 *       required:
 *         - shortCode
 *         - originalUrl
 *       properties:
 *         shortCode:
 *           type: string
 *           description: The unique short code
 *         originalUrl:
 *           type: string
 *           description: The original URL that the short code redirects to
 *         userId:
 *           type: string
 *           description: ID of the user who created this URL
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the URL was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the URL was last updated
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: The expiration date of the URL (optional)
 *         clicks:
 *           type: number
 *           description: Number of times the URL has been accessed
 *         active:
 *           type: boolean
 *           description: Whether the URL is active
 *         metadata:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *             description:
 *               type: string
 *             tags:
 *               type: array
 *               items:
 *                 type: string
 */
const urlSchema = new mongoose.Schema(
  {
    shortCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    originalUrl: {
      type: String,
      required: true,
      trim: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // Not required as some URLs might be created by anonymous users
    },
    expiresAt: {
      type: Date,
      default: null
    },
    clicks: {
      type: Number,
      default: 0
    },
    active: {
      type: Boolean,
      default: true
    },
    lastAccessedAt: {
      type: Date,
      default: null
    },
    metadata: {
      title: String,
      description: String,
      tags: [String]
    },
    // Track unique visitors
    uniqueVisitors: {
      type: Number,
      default: 0
    },
    // Store visitor IPs with last visit timestamp (hashed for privacy)
    visitorHistory: {
      type: Map,
      of: Date,
      default: new Map()
    }
  },
  { timestamps: true }
);

// Index for faster lookups
urlSchema.index({ shortCode: 1 });
urlSchema.index({ userId: 1 });
urlSchema.index({ expiresAt: 1 });

// Check if URL has expired
urlSchema.methods.hasExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Increment click count
urlSchema.methods.incrementClicks = function(visitorHash) {
  this.clicks += 1;
  this.lastAccessedAt = new Date();
  
  // Handle unique visitor tracking
  if (visitorHash && !this.visitorHistory.has(visitorHash)) {
    this.uniqueVisitors += 1;
    this.visitorHistory.set(visitorHash, new Date());
  }
  
  return this.save();
};

// Method to disable URL
urlSchema.methods.disable = function() {
  this.active = false;
  return this.save();
};

// Middleware to handle expired URLs before responding
urlSchema.pre('findOne', function() {
  // Automatically filter out expired or inactive URLs
  this.where({
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ],
    active: true
  });
});

// Create model
const Url = mongoose.model('Url', urlSchema);

module.exports = Url; 