const express = require('express');
const router = express.Router();
const ClickEvent = require('../models/ClickEvent');
const UrlStat = require('../models/UrlStat');
const logger = require('../services/logger');
const config = require('../config/config');
const rateLimit = require('express-rate-limit');

// Rate limiter for analytics endpoints
const analyticsLimiter = rateLimit({
  windowMs: config.rateLimit.api.windowMs,
  max: config.rateLimit.api.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.'
  }
});

/**
 * @swagger
 * /api/analytics/overview:
 *   get:
 *     summary: Get analytics overview
 *     description: Get overview analytics across all URLs
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year, all]
 *           default: week
 *         description: Time period for the analytics
 *     responses:
 *       200:
 *         description: Analytics overview
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.get('/overview', analyticsLimiter, async (req, res, next) => {
  try {
    const period = req.query.period || 'week';
    let startDate;
    
    const now = new Date();
    
    // Set date range filter based on period
    switch (period) {
      case 'day':
        // Last 24 hours
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        // Last 7 days
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        // Last 30 days
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        // Last 365 days
        startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        // All time, first record
        const firstEvent = await ClickEvent.findOne().sort({ timestamp: 1 }).select('timestamp');
        startDate = firstEvent ? new Date(firstEvent.timestamp) : new Date(0);
    }
    
    // Get total clicks
    const totalClicks = await ClickEvent.countDocuments({
      timestamp: { $gte: startDate }
    });
    
    // Get unique visitors
    const uniqueVisitors = await ClickEvent.distinct('visitorHash', {
      timestamp: { $gte: startDate }
    });
    
    // Get top URLs
    const topUrls = await UrlStat.find()
      .sort({ totalClicks: -1 })
      .limit(10)
      .select('shortCode originalUrl totalClicks uniqueVisitors');
      
    // Get clicks by country
    const clicksByCountry = await ClickEvent.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      { $group: { _id: '$countryCode', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get clicks by device type
    const clicksByDevice = await ClickEvent.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      { $group: { _id: '$deviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Get clicks over time
    const clicksOverTime = await ClickEvent.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    res.json({
      period,
      summary: {
        totalClicks,
        uniqueVisitors: uniqueVisitors.length,
        topUrls: topUrls.map(url => ({
          shortCode: url.shortCode,
          originalUrl: url.originalUrl,
          clicks: url.totalClicks,
          uniqueVisitors: url.uniqueVisitors
        }))
      },
      clicksByCountry: clicksByCountry.map(item => ({
        country: item._id || 'unknown',
        count: item.count
      })),
      clicksByDevice: clicksByDevice.map(item => ({
        device: item._id || 'unknown',
        count: item.count
      })),
      clicksOverTime: clicksOverTime.map(item => ({
        date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
        clicks: item.count
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/urls/{shortCode}:
 *   get:
 *     summary: Get detailed URL analytics
 *     description: Get detailed analytics for a specific URL
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         description: Short code of the URL
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year, all]
 *           default: month
 *         description: Time period for the analytics
 *     responses:
 *       200:
 *         description: URL analytics
 *       404:
 *         description: URL not found
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.get('/urls/:shortCode', analyticsLimiter, async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const period = req.query.period || 'month';
    
    // Find URL stats
    const urlStat = await UrlStat.findOne({ shortCode });
    
    if (!urlStat) {
      const error = new Error(`URL with short code ${shortCode} not found`);
      error.statusCode = 404;
      return next(error);
    }
    
    // Get start date based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        startDate = new Date(0);
    }
    
    // Get recent clicks
    const recentClicks = await ClickEvent.find({ shortCode, timestamp: { $gte: startDate } })
      .sort({ timestamp: -1 })
      .limit(100)
      .select('timestamp countryCode deviceType referer');
    
    // Get clicks by hour of day
    const hourlyClicks = Object.entries(urlStat.hourlyStats.toJSON() || {})
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count
      }))
      .sort((a, b) => a.hour - b.hour);
    
    // Get clicks by day of week
    const dailyClicks = Object.entries(urlStat.dailyStats.toJSON() || {})
      .map(([day, count]) => ({
        day: parseInt(day),
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseInt(day)],
        count
      }))
      .sort((a, b) => a.day - b.day);
    
    // Get time series data
    let timeSeriesData = urlStat.timeSeriesDaily || [];
    
    // Filter by period
    timeSeriesData = timeSeriesData.filter(entry => new Date(entry.date) >= startDate);
    
    // Format response
    res.json({
      shortCode: urlStat.shortCode,
      originalUrl: urlStat.originalUrl,
      userId: urlStat.userId,
      totalClicks: urlStat.totalClicks,
      uniqueVisitors: urlStat.uniqueVisitors,
      lastClickAt: urlStat.lastClickAt,
      createdAt: urlStat.urlCreatedAt || urlStat.createdAt,
      countryStats: urlStat.countryStats,
      deviceStats: urlStat.deviceStats,
      refererStats: urlStat.refererStats,
      hourlyClicks,
      dailyClicks,
      timeSeries: timeSeriesData.map(entry => ({
        date: entry.date,
        clicks: entry.clicks,
        uniqueVisitors: entry.uniqueVisitors
      })),
      recentClicks: recentClicks.map(click => ({
        timestamp: click.timestamp,
        country: click.countryCode,
        device: click.deviceType,
        referer: click.referer
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/clicks/timeseries:
 *   get:
 *     summary: Get clicks time series data
 *     description: Get time series data of clicks over time
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: shortCode
 *         schema:
 *           type: string
 *         description: Optional short code to filter for a specific URL
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *           default: day
 *         description: Time period granularity
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: week
 *         description: Time range to analyze
 *     responses:
 *       200:
 *         description: Time series data
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.get('/clicks/timeseries', analyticsLimiter, async (req, res, next) => {
  try {
    const { shortCode } = req.query;
    const period = req.query.period || 'day';
    const range = req.query.range || 'week';
    
    // Set date range
    const now = new Date();
    let startDate;
    
    switch (range) {
      case 'day':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
      default:
        startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
    }
    
    // Build match stage
    const matchStage = {
      timestamp: { $gte: startDate }
    };
    
    if (shortCode) {
      matchStage.shortCode = shortCode;
    }
    
    // Build group by time period
    let groupStage;
    switch (period) {
      case 'hour':
        groupStage = {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
              day: { $dayOfMonth: '$timestamp' },
              hour: { $hour: '$timestamp' }
            },
            clicks: { $sum: 1 }
          }
        };
        break;
      case 'day':
        groupStage = {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' },
              day: { $dayOfMonth: '$timestamp' }
            },
            clicks: { $sum: 1 }
          }
        };
        break;
      case 'week':
        groupStage = {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              week: { $week: '$timestamp' }
            },
            clicks: { $sum: 1 }
          }
        };
        break;
      case 'month':
      default:
        groupStage = {
          $group: {
            _id: {
              year: { $year: '$timestamp' },
              month: { $month: '$timestamp' }
            },
            clicks: { $sum: 1 }
          }
        };
    }
    
    // Get time series data
    const timeSeries = await ClickEvent.aggregate([
      { $match: matchStage },
      groupStage,
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);
    
    // Format time series data
    const formattedTimeSeries = timeSeries.map(item => {
      let timestamp;
      
      switch (period) {
        case 'hour':
          timestamp = new Date(
            item._id.year,
            item._id.month - 1,
            item._id.day,
            item._id.hour
          ).toISOString();
          break;
        case 'day':
          timestamp = new Date(
            item._id.year,
            item._id.month - 1,
            item._id.day
          ).toISOString();
          break;
        case 'week':
          // Get first day of the week
          const date = new Date(item._id.year, 0, 1);
          date.setDate(date.getDate() + (item._id.week - 1) * 7);
          timestamp = date.toISOString();
          break;
        case 'month':
          timestamp = new Date(
            item._id.year,
            item._id.month - 1,
            1
          ).toISOString();
          break;
      }
      
      return {
        timestamp,
        clicks: item.clicks
      };
    });
    
    res.json({
      shortCode: shortCode || 'all',
      period,
      range,
      timeSeries: formattedTimeSeries
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     summary: Export analytics data
 *     description: Export analytics data in CSV or JSON format
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: shortCode
 *         schema:
 *           type: string
 *         description: Optional short code to filter for a specific URL
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for export (ISO format)
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for export (ISO format)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json]
 *           default: csv
 *         description: Export format
 *     responses:
 *       200:
 *         description: Exported data
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *           application/json:
 *             schema:
 *               type: object
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.get('/export', analyticsLimiter, async (req, res, next) => {
  try {
    const { shortCode, format = 'csv' } = req.query;
    
    // Parse dates, defaulting to last 30 days if not provided
    const now = new Date();
    const startDate = req.query.start ? new Date(req.query.start) : new Date(now - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end ? new Date(req.query.end) : now;
    
    // Build query
    const query = {
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    if (shortCode) {
      query.shortCode = shortCode;
    }
    
    // Get click events
    const clicks = await ClickEvent.find(query)
      .select('shortCode originalUrl timestamp countryCode deviceType referer')
      .sort({ timestamp: -1 })
      .limit(10000); // Limit export size
      
    if (format === 'json') {
      return res.json({
        data: clicks,
        meta: {
          total: clicks.length,
          startDate,
          endDate,
          shortCode: shortCode || 'all'
        }
      });
    } else {
      // Generate CSV
      let csv = 'shortCode,originalUrl,timestamp,countryCode,deviceType,referer\n';
      
      clicks.forEach(click => {
        csv += `${click.shortCode},${click.originalUrl.replace(/,/g, '%2C')},${click.timestamp.toISOString()},${click.countryCode || ''},${click.deviceType || ''},${(click.referer || '').replace(/,/g, '%2C')}\n`;
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=url-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
      res.send(csv);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/summary:
 *   get:
 *     summary: Get quick summary
 *     description: Get a quick summary of analytics for dashboard
 *     tags:
 *       - Analytics
 *     responses:
 *       200:
 *         description: Quick analytics summary
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.get('/summary', analyticsLimiter, async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7days = new Date(today);
    last7days.setDate(last7days.getDate() - 7);
    const last30days = new Date(today);
    last30days.setDate(last30days.getDate() - 30);
    
    // Total clicks
    const totalClicks = await ClickEvent.countDocuments();
    
    // Clicks today
    const clicksToday = await ClickEvent.countDocuments({
      timestamp: { $gte: today }
    });
    
    // Clicks yesterday
    const clicksYesterday = await ClickEvent.countDocuments({
      timestamp: { $gte: yesterday, $lt: today }
    });
    
    // Clicks last 7 days
    const clicksLast7Days = await ClickEvent.countDocuments({
      timestamp: { $gte: last7days }
    });
    
    // Clicks last 30 days
    const clicksLast30Days = await ClickEvent.countDocuments({
      timestamp: { $gte: last30days }
    });
    
    // Unique visitors today
    const uniqueVisitorsToday = await ClickEvent.distinct('visitorHash', {
      timestamp: { $gte: today }
    });
    
    // Active URLs (URLs that have been clicked in the last 30 days)
    const activeUrls = await ClickEvent.distinct('shortCode', {
      timestamp: { $gte: last30days }
    });
    
    res.json({
      totalClicks,
      clicksToday,
      clicksYesterday,
      clicksLast7Days,
      clicksLast30Days,
      uniqueVisitorsToday: uniqueVisitorsToday.length,
      activeUrls: activeUrls.length,
      clicksGrowthRate: {
        daily: clicksYesterday > 0 ? ((clicksToday - clicksYesterday) / clicksYesterday * 100).toFixed(2) : 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 