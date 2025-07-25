const mongoose = require('mongoose');

const UrlSchema = new mongoose.Schema({
  shortCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  originalUrl: {
    type: String,
    required: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 365*24*60*60*1000) // Default 1 year
  },
  isActive: {
    type: Boolean,
    default: true
  },
  clickCount: {
    type: Number,
    default: 0
  },
  lastClickedAt: {
    type: Date
  }
});

// Index for faster lookups
UrlSchema.index({ shortCode: 1 });
UrlSchema.index({ userId: 1 });

module.exports = mongoose.model('Url', UrlSchema); 