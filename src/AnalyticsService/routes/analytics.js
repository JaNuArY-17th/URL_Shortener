const express = require('express');
const router = express.Router();
const ClickEvent = require('../models/ClickEvent');
const UrlStat = require('../models/UrlStat');
const logger = require('../services/logger');
const config = require('../config/config');
const rateLimit = require('express-rate-limit');
const { authenticate, authenticateOptional } = require('../middleware/authenticate');

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
 *     description: Get overview analytics for the authenticated user's URLs
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
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.get('/overview', analyticsLimiter, authenticateOptional, async (req, res, next) => {
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
    
    // Base query
    const query = { timestamp: { $gte: startDate } };
    
    // If user is authenticated, filter by userId
    if (req.user?.id) {
      // First, get all URLs belonging to this user
      const userUrlStats = await UrlStat.find({ userId: req.user.id }).select('shortCode');
      const userShortCodes = userUrlStats.map(stat => stat.shortCode);
      
      // Add filter for user's URLs only
      if (userShortCodes.length > 0) {
        query.shortCode = { $in: userShortCodes };
      } else {
        // If user has no URLs, return empty results
        return res.json({
          totalClicks: 0,
          uniqueVisitors: 0,
          clicksByCountry: [],
          clicksByDevice: [],
          clicksByReferrer: [],
          clicksOverTime: []
        });
      }
    }
    
    // Get total clicks
    const totalClicks = await ClickEvent.countDocuments(query);
    
    // Get unique visitors
    const uniqueVisitors = await ClickEvent.distinct('visitorHash', query);
    
    // Get top URLs (filtered by user if authenticated)
    let topUrlsQuery = {};
    if (req.user?.id) {
      topUrlsQuery.userId = req.user.id;
    }
    
    const topUrls = await UrlStat.find(topUrlsQuery)
      .sort({ totalClicks: -1 })
      .limit(10)
      .select('shortCode originalUrl totalClicks uniqueVisitors userId');
      
    // Get clicks by country
    const clicksByCountry = await ClickEvent.aggregate([
      { $match: query },
      { $group: { _id: '$countryCode', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get clicks by device
    const clicksByDevice = await ClickEvent.aggregate([
      { $match: query },
      { $group: { _id: '$deviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get clicks by referrer
    const clicksByReferer = await ClickEvent.aggregate([
      { $match: query },
      { 
        $addFields: {
          // Extract domain from referrer
          refererDomain: {
            $cond: {
              if: { $eq: ['$referer', 'direct'] },
              then: 'direct',
              else: {
                $let: {
                  vars: {
                    // Extract hostname from URL
                    parts: { $split: ['$referer', '/'] }
                  },
                  in: {
                    $cond: {
                      if: { $gt: [{ $size: '$$parts' }, 2] },
                      then: { $arrayElemAt: ['$$parts', 2] },
                      else: '$referer'
                    }
                  }
                }
              }
            }
          }
        }
      },
      { $group: { _id: '$refererDomain', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Format the data
    const formattedData = {
      period,
      totalClicks,
      uniqueVisitors: uniqueVisitors.length,
      topUrls: topUrls.map(url => ({
        shortCode: url.shortCode,
        originalUrl: url.originalUrl,
        clicks: url.totalClicks,
        uniqueVisitors: url.uniqueVisitors
      })),
      clicksByCountry: clicksByCountry.map(item => ({
        country: item._id || 'unknown',
        count: item.count
      })),
      clicksByDevice: clicksByDevice.map(item => ({
        device: item._id || 'unknown',
        count: item.count
      })),
      clicksByReferer: clicksByReferer.map(item => ({
        referer: item._id || 'unknown',
        count: item.count
      }))
    };
    
    res.json(formattedData);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/analytics/summary:
 *   get:
 *     summary: Get analytics summary
 *     description: Get a quick summary of analytics metrics for the authenticated user's URLs
 *     tags:
 *       - Analytics
 *     responses:
 *       200:
 *         description: Analytics summary
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.get('/summary', analyticsLimiter, authenticateOptional, async (req, res, next) => {
  try {
    // Base query for UrlStat
    let urlStatQuery = {};
    
    // If user is authenticated, filter by userId
    if (req.user?.id) {
      urlStatQuery.userId = req.user.id;
    }
    
    // Get active URLs count
    const activeUrls = await UrlStat.countDocuments({ 
      ...urlStatQuery,
      active: true 
    });
    
    // Get total clicks and today's clicks
    let totalClicks = 0;
    let clicksToday = 0;
    let uniqueVisitors = 0;
    
    // Get aggregate stats from URL stats
    const urlStats = await UrlStat.find(urlStatQuery);
    
    if (urlStats.length > 0) {
      // Sum up clicks from all matching URLs
      totalClicks = urlStats.reduce((sum, stat) => sum + (stat.totalClicks || 0), 0);
      uniqueVisitors = urlStats.reduce((sum, stat) => sum + (stat.uniqueVisitors || 0), 0);
      
      // For today's clicks, we need to query the click events
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      // Get all shortCodes for the user's URLs
      const shortCodes = urlStats.map(stat => stat.shortCode);
      
      // Query click events for today
      if (shortCodes.length > 0) {
        clicksToday = await ClickEvent.countDocuments({
          shortCode: { $in: shortCodes },
          timestamp: { $gte: startOfDay }
        });
      }
    }
    
    // Get top referrers 
    const topReferrers = await ClickEvent.aggregate([
      { 
        $match: req.user?.id ? {
          shortCode: { $in: urlStats.map(stat => stat.shortCode) }
        } : {} 
      },
      {
        $addFields: {
          refererDomain: {
            $cond: {
              if: { $eq: ['$referer', 'direct'] },
              then: 'direct',
              else: {
                $let: {
                  vars: { parts: { $split: ['$referer', '/'] } },
                  in: {
                    $cond: {
                      if: { $gt: [{ $size: '$$parts' }, 2] },
                      then: { $arrayElemAt: ['$$parts', 2] },
                      else: '$referer'
                    }
                  }
                }
              }
            }
          }
        }
      },
      { $group: { _id: '$refererDomain', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Get top locations
    const topLocations = await ClickEvent.aggregate([
      { 
        $match: req.user?.id ? {
          shortCode: { $in: urlStats.map(stat => stat.shortCode) }
        } : {} 
      },
      { $group: { _id: '$countryCode', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Format response
    res.json({
      totalClicks,
      clicksToday,
      activeUrls,
      uniqueVisitors,
      topReferrers: topReferrers.map(item => ({
        source: item._id || 'unknown',
        count: item.count
      })),
      topLocations: topLocations.map(item => ({
        location: item._id || 'unknown',
        count: item.count
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
 *     summary: Get detailed analytics for a URL
 *     description: Get detailed analytics for a specific URL
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Short code of the URL
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not the owner of this URL
 *       404:
 *         description: URL not found
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.get('/urls/:shortCode', analyticsLimiter, authenticateOptional, async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const period = req.query.period || 'month';
    
    // Find URL stats
    const urlStat = await UrlStat.findOne({ shortCode });
    
    // Handle not found
    if (!urlStat) {
      const error = new Error(`URL with short code ${shortCode} not found`);
      error.statusCode = 404;
      throw error;
    }
    
    // If user is authenticated, check ownership
    if (req.user?.id && urlStat.userId && urlStat.userId.toString() !== req.user.id.toString()) {
      const error = new Error('You do not have permission to view analytics for this URL');
      error.statusCode = 403;
      throw error;
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
 *         description: Time resolution for the data
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: week
 *         description: Date range for the data
 *     responses:
 *       200:
 *         description: Time series data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not the owner of this URL
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.get('/clicks/timeseries', analyticsLimiter, authenticateOptional, async (req, res, next) => {
  try {
    const { shortCode } = req.query;
    const period = req.query.period || 'day';
    const range = req.query.range || 'week';
    
    // If shortCode is provided and user is authenticated, verify ownership
    if (shortCode && req.user?.id) {
      const url = await UrlStat.findOne({ shortCode });
      if (url && url.userId && url.userId.toString() !== req.user.id.toString()) {
        const error = new Error('You do not have permission to view analytics for this URL');
        error.statusCode = 403;
        throw error;
      }
    }
    
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
    
    // If a specific shortCode is requested
    if (shortCode) {
      matchStage.shortCode = shortCode;
    } 
    // If user is authenticated and no specific shortCode, filter by user's URLs
    else if (req.user?.id) {
      // Get user's URLs
      const userUrls = await UrlStat.find({ userId: req.user.id }).select('shortCode');
      const userShortCodes = userUrls.map(url => url.shortCode);
      
      if (userShortCodes.length > 0) {
        matchStage.shortCode = { $in: userShortCodes };
      } else {
        // If user has no URLs, return empty timeseries
        return res.json({
          shortCode,
          period,
          range,
          timeSeries: []
        });
      }
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
            clicks: { $sum: 1 },
            uniqueVisitors: { $addToSet: '$visitorHash' }
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
            clicks: { $sum: 1 },
            uniqueVisitors: { $addToSet: '$visitorHash' }
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
            clicks: { $sum: 1 },
            uniqueVisitors: { $addToSet: '$visitorHash' }
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
            clicks: { $sum: 1 },
            uniqueVisitors: { $addToSet: '$visitorHash' }
          }
        };
    }
    
    // Get time series data
    const timeSeries = await ClickEvent.aggregate([
      { $match: matchStage },
      groupStage,
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } },
      { 
        $project: {
          _id: 0,
          timestamp: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month' || 1,
              day: '$_id.day' || 1,
              hour: '$_id.hour' || 0
            }
          },
          clicks: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' }
        }
      }
    ]);
    
    res.json({
      shortCode,
      period,
      range,
      timeSeries
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
 *     description: Export analytics data in CSV, JSON, or Excel format
 *     tags:
 *       - Analytics
 *     parameters:
 *       - in: query
 *         name: shortCode
 *         schema:
 *           type: string
 *         description: Optional short code to filter for a specific URL
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the export (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the export (YYYY-MM-DD)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, json, xlsx]
 *           default: csv
 *         description: Export format
 *     responses:
 *       200:
 *         description: Analytics data in requested format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not the owner of this URL
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.get('/export', analyticsLimiter, authenticateOptional, async (req, res, next) => {
  try {
    const { shortCode } = req.query;
    const format = req.query.format || 'csv';
    
    // Parse dates
    let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);
    
    // If shortCode is provided and user is authenticated, verify ownership
    if (shortCode && req.user?.id) {
      const url = await UrlStat.findOne({ shortCode });
      if (url && url.userId && url.userId.toString() !== req.user.id.toString()) {
        const error = new Error('You do not have permission to export analytics for this URL');
        error.statusCode = 403;
        throw error;
      }
    }
    
    // Build query
    const query = {
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    // If a specific shortCode is requested
    if (shortCode) {
      query.shortCode = shortCode;
    } 
    // If user is authenticated and no specific shortCode, filter by user's URLs
    else if (req.user?.id) {
      // Get user's URLs
      const userUrls = await UrlStat.find({ userId: req.user.id }).select('shortCode');
      const userShortCodes = userUrls.map(url => url.shortCode);
      
      if (userShortCodes.length > 0) {
        query.shortCode = { $in: userShortCodes };
      } else {
        // If user has no URLs, return empty data
        return res.status(404).json({
          status: 'error',
          message: 'No URLs found for this user'
        });
      }
    }
    
    // Get click events
    const clickEvents = await ClickEvent.find(query)
      .sort({ timestamp: -1 })
      .select('shortCode timestamp countryCode deviceType referer visitorHash');
    
    // Format data for export
    const data = clickEvents.map(click => ({
      shortCode: click.shortCode,
      timestamp: click.timestamp,
      country: click.countryCode,
      device: click.deviceType,
      referer: click.referer,
      visitorHash: click.visitorHash.slice(-8) // Only include last 8 chars for privacy
    }));
    
    // Handle different export formats
    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-export-${new Date().toISOString().slice(0, 10)}.json`);
        return res.json(data);
      
      case 'xlsx':
        // Note: In a real implementation, you would use a library like exceljs
        // For this example, we'll return JSON with a note
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-export-${new Date().toISOString().slice(0, 10)}.json`);
        return res.json({
          format: 'xlsx requested but not implemented in this example',
          data
        });
      
      case 'csv':
      default:
        // Convert to CSV format
        const csvHeader = 'Short Code,Timestamp,Country,Device,Referrer,Visitor ID\n';
        const csvData = data.map(row => 
          `${row.shortCode},${row.timestamp.toISOString()},${row.country},${row.device},${row.referer},${row.visitorHash}`
        ).join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-export-${new Date().toISOString().slice(0, 10)}.csv`);
        return res.send(csvHeader + csvData);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router; 