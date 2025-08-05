const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Privacy-aware data service for AI Assistant
 * Provides full database access while protecting sensitive user information
 */
class PrivacyAwareDataService {
  constructor() {
    this.connections = {};
    this.initializeConnections();
  }

  /**
   * Initialize separate database connections for different data types
   */
  async initializeConnections() {
    try {
      // Analytics database - full access (already anonymized)
      this.connections.analytics = await mongoose.createConnection(
        process.env.MONGODB_ANALYTICS_URI || 
        'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/analytics?retryWrites=true&w=majority&appName=Cluster1'
      );

      // Redirect database - full access (contains userId but not personal data)
      this.connections.redirect = await mongoose.createConnection(
        process.env.MONGODB_REDIRECT_URI || 
        'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/redirect?retryWrites=true&w=majority&appName=Cluster1'
      );

      // Notification database - limited access
      this.connections.notification = await mongoose.createConnection(
        process.env.MONGODB_NOTIFICATION_URI || 
        'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/notification?retryWrites=true&w=majority&appName=Cluster1'
      );

      // Auth database - privacy-protected access
      this.connections.auth = await mongoose.createConnection(
        process.env.MONGODB_AUTH_URI || 
        'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/auth?retryWrites=true&w=majority&appName=Cluster1'
      );

      console.log('All database connections initialized for AI service');
    } catch (error) {
      console.error('Failed to initialize database connections:', error);
      throw error;
    }
  }

  /**
   * Get analytics data - full access (already anonymized)
   */
  async getAnalyticsData(query = {}) {
    const ClickEvent = this.connections.analytics.model('ClickEvent', require('../models/ClickEvent').schema);
    const UrlStat = this.connections.analytics.model('UrlStat', require('../models/UrlStat').schema);

    return {
      clickEvents: await ClickEvent.find(query).lean(),
      urlStats: await UrlStat.find(query).lean()
    };
  }

  /**
   * Get URL data - full access (contains userId but not personal info)
   */
  async getUrlData(query = {}) {
    const Url = this.connections.redirect.model('Url', require('../models/Url').schema);
    return await Url.find(query).lean();
  }

  /**
   * Get user data - PRIVACY PROTECTED
   * Only returns non-sensitive aggregated information
   */
  async getUserInsights(userId = null) {
    const User = this.connections.auth.model('User', require('../models/User').schema);
    
    if (userId) {
      // Get specific user insights without sensitive data
      return await User.findById(userId, {
        _id: 1,
        role: 1,
        createdAt: 1,
        updatedAt: 1,
        // Explicitly exclude sensitive fields
        password: 0,
        email: 0,
        name: 0
      }).lean();
    } else {
      // Get aggregated user statistics
      return await User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            adminUsers: {
              $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
            },
            regularUsers: {
              $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] }
            },
            usersThisMonth: {
              $sum: {
                $cond: [
                  {
                    $gte: [
                      '$createdAt',
                      new Date(new Date().setDate(1)) // First day of current month
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
    }
  }

  /**
   * Get comprehensive analytics for AI insights
   * Combines data from multiple sources while protecting privacy
   */
  async getComprehensiveAnalytics(timeRange = '7d') {
    const endDate = new Date();
    const startDate = new Date();
    
    // Calculate start date based on time range
    switch (timeRange) {
      case '1d': startDate.setDate(endDate.getDate() - 1); break;
      case '7d': startDate.setDate(endDate.getDate() - 7); break;
      case '30d': startDate.setDate(endDate.getDate() - 30); break;
      case '90d': startDate.setDate(endDate.getDate() - 90); break;
      default: startDate.setDate(endDate.getDate() - 7);
    }

    const [analyticsData, urlData, userStats] = await Promise.all([
      this.getAnalyticsData({
        timestamp: { $gte: startDate, $lte: endDate }
      }),
      this.getUrlData({
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      this.getUserInsights()
    ]);

    return {
      timeRange: {
        start: startDate,
        end: endDate,
        period: timeRange
      },
      analytics: {
        totalClicks: analyticsData.clickEvents.length,
        uniqueUrls: new Set(analyticsData.clickEvents.map(e => e.shortCode)).size,
        topCountries: this.aggregateByField(analyticsData.clickEvents, 'countryCode'),
        deviceTypes: this.aggregateByField(analyticsData.clickEvents, 'deviceType'),
        referrers: this.aggregateByField(analyticsData.clickEvents, 'referer'),
        hourlyDistribution: this.getHourlyDistribution(analyticsData.clickEvents)
      },
      urls: {
        totalCreated: urlData.length,
        activeUrls: urlData.filter(url => url.active).length,
        expiredUrls: urlData.filter(url => url.expiresAt && new Date(url.expiresAt) < new Date()).length,
        avgClicksPerUrl: urlData.reduce((sum, url) => sum + url.clicks, 0) / urlData.length || 0
      },
      users: userStats[0] || {
        totalUsers: 0,
        adminUsers: 0,
        regularUsers: 0,
        usersThisMonth: 0
      }
    };
  }

  /**
   * Get user behavior patterns (anonymized)
   */
  async getUserBehaviorPatterns() {
    const Url = this.connections.redirect.model('Url', require('../models/Url').schema);
    
    return await Url.aggregate([
      {
        $group: {
          _id: '$userId',
          urlCount: { $sum: 1 },
          totalClicks: { $sum: '$clicks' },
          avgClicks: { $avg: '$clicks' },
          lastActivity: { $max: '$lastAccessedAt' },
          firstUrl: { $min: '$createdAt' }
        }
      },
      {
        $project: {
          // Hash userId for privacy
          userHash: { $substr: [{ $toString: '$_id' }, 0, 8] },
          metrics: {
            urlCount: '$urlCount',
            totalClicks: '$totalClicks',
            avgClicks: '$avgClicks',
            daysSinceLastActivity: {
              $dateDiff: {
                startDate: '$lastActivity',
                endDate: new Date(),
                unit: 'day'
              }
            },
            accountAge: {
              $dateDiff: {
                startDate: '$firstUrl',
                endDate: new Date(),
                unit: 'day'
              }
            }
          },
          _id: 0
        }
      },
      {
        $sort: { 'metrics.totalClicks': -1 }
      }
    ]);
  }

  /**
   * Helper method to aggregate data by field
   */
  aggregateByField(data, field) {
    const counts = {};
    data.forEach(item => {
      const value = item[field] || 'unknown';
      counts[value] = (counts[value] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([key, value]) => ({ [field]: key, count: value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }

  /**
   * Get hourly distribution of clicks
   */
  getHourlyDistribution(clickEvents) {
    const hourly = new Array(24).fill(0);
    clickEvents.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourly[hour]++;
    });
    
    return hourly.map((count, hour) => ({
      hour: `${hour}:00`,
      clicks: count
    }));
  }

  /**
   * Generate AI-ready dataset for analysis
   */
  async generateAIDataset(options = {}) {
    const {
      includeUserBehavior = true,
      includeAnalytics = true,
      includeUrlMetrics = true,
      timeRange = '30d'
    } = options;

    const dataset = {};

    if (includeAnalytics) {
      dataset.analytics = await this.getComprehensiveAnalytics(timeRange);
    }

    if (includeUserBehavior) {
      dataset.userBehavior = await this.getUserBehaviorPatterns();
    }

    if (includeUrlMetrics) {
      dataset.urlMetrics = await this.getUrlData({
        createdAt: { 
          $gte: new Date(Date.now() - this.getTimeRangeMs(timeRange))
        }
      });
    }

    return {
      generatedAt: new Date(),
      timeRange,
      dataPoints: {
        analytics: dataset.analytics?.analytics?.totalClicks || 0,
        users: dataset.userBehavior?.length || 0,
        urls: dataset.urlMetrics?.length || 0
      },
      dataset
    };
  }

  /**
   * Convert time range string to milliseconds
   */
  getTimeRangeMs(timeRange) {
    const day = 24 * 60 * 60 * 1000;
    switch (timeRange) {
      case '1d': return day;
      case '7d': return 7 * day;
      case '30d': return 30 * day;
      case '90d': return 90 * day;
      default: return 7 * day;
    }
  }

  /**
   * Close all database connections
   */
  async closeConnections() {
    for (const [name, connection] of Object.entries(this.connections)) {
      try {
        await connection.close();
        console.log(`Closed ${name} database connection`);
      } catch (error) {
        console.error(`Error closing ${name} connection:`, error);
      }
    }
  }
}

module.exports = PrivacyAwareDataService;