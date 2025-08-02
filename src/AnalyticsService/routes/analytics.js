const express = require('express');
const router = express.Router();
const ClickEvent = require('../models/ClickEvent');
const UrlStat = require('../models/UrlStat');
const logger = require('../services/logger');
const config = require('../config/config');
const rateLimit = require('express-rate-limit');
const { authenticate, authenticateOptional } = require('../middleware/authenticate');
const cacheService = require('../services/cacheService');

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
    
    // Check for userId from query parameters or authenticated user
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }
    
    // Generate cache key
    const cacheKey = cacheService.generateAnalyticsKey('overview', 'all', { 
      userId, 
      period 
    });
    
    // Try to get from cache first
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      logger.debug(`Serving overview data from cache for user ${userId}, period: ${period}`);
      return res.json(cachedData);
    }
    
    logger.debug(`Overview request - Period: ${period}, User ID: ${userId}`);
    
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
    
    // Base query for event data
    const query = { timestamp: { $gte: startDate } };
    
    // Base query for URL stats
    let urlStatQuery = {};
    
    logger.debug(`Filtering overview for user ${userId}`);
    
    // Get URL shortCodes for this user to filter click events
    const userUrlStats = await UrlStat.find({ userId: userId }).select('shortCode');
    logger.debug(`Found ${userUrlStats.length} URLs for user ${userId}`);
    
    if (userUrlStats.length > 0) {
      const userShortCodes = userUrlStats.map(stat => stat.shortCode);
      // Filter click events by user's URLs
      query.shortCode = { $in: userShortCodes };
      urlStatQuery.userId = userId;
      
      logger.debug(`Filtering overview for ${userShortCodes.length} URLs: ${userShortCodes.join(', ')}`);
    } else {
      // If user has no URLs, return empty results
      logger.debug(`User ${userId} has no URLs, returning empty overview`);
      return res.json({
        period,
        totalClicks: 0,
        uniqueVisitors: 0,
        topUrls: [],
        clicksByCountry: [],
        clicksByDevice: [],
        clicksByReferer: []
      });
    }
    
    // Get total clicks
    const totalClicks = await ClickEvent.countDocuments(query);
    logger.debug(`Total clicks: ${totalClicks}`);
    
    // Get unique visitors
    const uniqueVisitors = await ClickEvent.distinct('visitorHash', query);
    logger.debug(`Unique visitors: ${uniqueVisitors.length}`);
    
    // Get top URLs (filtered by user if userId provided)
    let topUrlsQuery = userId ? { userId: userId } : {};
    const topUrls = await UrlStat.find(topUrlsQuery)
      .sort({ totalClicks: -1 })
      .limit(10)
      .select('shortCode originalUrl totalClicks uniqueVisitors userId');
    
    logger.debug(`Top URLs: ${topUrls.length} found`);
    
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
          refererDomain: {
            $cond: {
              if: { $eq: ['$referer', 'direct'] },
              then: 'direct',
              else: {
                $let: {
                  vars: {
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
    
    // Cache the results
    // Use different expiry based on the period
    let cacheExpiry;
    switch (period) {
      case 'day':
        cacheExpiry = 300; // 5 minutes for day view (more frequently changing)
        break;
      case 'week':
        cacheExpiry = 900; // 15 minutes for week view
        break;
      case 'month':
        cacheExpiry = 1800; // 30 minutes for month view
        break;
      default:
        cacheExpiry = 3600; // 1 hour for year and all views
    }
    
    await cacheService.set(cacheKey, formattedData, cacheExpiry);
    logger.debug(`Overview data cached for user ${userId}, period: ${period}`);
    
    logger.debug(`Overview data prepared: ${totalClicks} total clicks, ${uniqueVisitors.length} unique visitors`);
    res.json(formattedData);
  } catch (error) {
    logger.error('Error in /api/analytics/overview:', error);
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
// ENDPOINT /api/analytics/summary
router.get('/summary', analyticsLimiter, authenticateOptional, async (req, res, next) => {
  try {
    // Check for userId from query parameters or authenticated user
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }
    
    // Generate cache key
    const cacheKey = cacheService.generateAnalyticsKey('summary', 'all', { 
      userId 
    });
    
    // Try to get from cache first
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      logger.debug(`Serving summary data from cache for user ${userId}`);
      return res.json(cachedData);
    }
    
    logger.debug(`Summary request - User ID: ${userId || 'none'}, Query: ${JSON.stringify(req.query)}`);
    
    // Base query for UrlStat
    let urlStatQuery = {};
    
    urlStatQuery.userId = userId;
    logger.debug(`Filtering summary for user ${userId}`);
    
    // Initialize default values to ensure we always return something
    let totalClicks = 0;
    let clicksToday = 0;
    let activeUrls = 0;
    let uniqueVisitors = 0;
    
    // Get active URLs count
    activeUrls = await UrlStat.countDocuments({ 
      ...urlStatQuery,
      active: true 
    });
    logger.debug(`Active URLs count: ${activeUrls}`);
    
    // Get aggregate stats from URL stats
    const urlStats = await UrlStat.find(urlStatQuery);
    logger.debug(`Found ${urlStats.length} URLs matching query: ${JSON.stringify(urlStatQuery)}`);
    
    // Debug info - log each URL found
    urlStats.forEach(stat => {
      logger.debug(`URL: ${stat.shortCode}, userId: ${stat.userId}, clicks: ${stat.totalClicks || 0}, uniqueVisitors: ${stat.uniqueVisitors || 0}`);
    });
    
    if (urlStats.length > 0) {
      // Sum up clicks from all matching URLs
      totalClicks = urlStats.reduce((sum, stat) => sum + (stat.totalClicks || 0), 0);
      uniqueVisitors = urlStats.reduce((sum, stat) => sum + (stat.uniqueVisitors || 0), 0);
      
      logger.debug(`Total clicks from URL stats: ${totalClicks}`);
      logger.debug(`Unique visitors from URL stats: ${uniqueVisitors}`);
      
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
        logger.debug(`Today's clicks: ${clicksToday}`);
      }
    } else {
      logger.debug(`No URLs found for ${userId ? 'user ' + userId : 'global'} summary, returning zeros`);
    }
    
    // Get top referrers based on user's URLs
    let topReferrers = [];
    if (urlStats.length > 0) {
      const shortCodes = urlStats.map(stat => stat.shortCode);
      topReferrers = await ClickEvent.aggregate([
        { 
          $match: {
            shortCode: { $in: shortCodes }
          }
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
    }
    
    // Get top locations based on user's URLs
    let topLocations = [];
    if (urlStats.length > 0) {
      const shortCodes = urlStats.map(stat => stat.shortCode);
      topLocations = await ClickEvent.aggregate([
        { 
          $match: {
            shortCode: { $in: shortCodes }
          }
        },
        { $group: { _id: '$countryCode', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
    }
    
    // Format response
    const response = {
      totalClicks,
      clicksToday,
      activeUrls,
      uniqueVisitors,
      topReferrers: topReferrers.map(item => ({
        source: item._id || 'unknown',
        count: item.count
      })) || [],
      topLocations: topLocations.map(item => ({
        location: item._id || 'unknown',
        count: item.count
      })) || []
    };
    
    // Cache the results - summary data changes more frequently, so use shorter expiry
    await cacheService.set(cacheKey, response, 600); // 10 minutes
    logger.debug(`Summary data cached for user ${userId}`);
    
    logger.debug(`Summary data prepared: ${JSON.stringify(response)}`);
    res.json(response);
  } catch (error) {
    logger.error('Error in /api/analytics/summary:', error);
    // Send a default response with zeros in case of error
    res.status(500).json({
      totalClicks: 0,
      clicksToday: 0,
      activeUrls: 0,
      uniqueVisitors: 0,
      topReferrers: [],
      topLocations: []
    });
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
// ENDPOINT /api/analytics/urls/:shortCode
router.get('/urls/:shortCode', analyticsLimiter, authenticateOptional, async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const period = req.query.period || 'week';
    
    // Check for userId from query parameters or authenticated user
    const userId = req.query.userId || req.user?.id;
    
    // Generate cache key
    const cacheKey = cacheService.generateAnalyticsKey(shortCode, 'details', { 
      period 
    });
    
    // Try to get from cache first
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      // Still verify ownership if userId provided
      if (userId && cachedData.userId && userId !== cachedData.userId.toString()) {
        logger.warn(`User ${userId} tried to access cached analytics for URL ${shortCode} owned by ${cachedData.userId}`);
        return res.status(403).json({ error: 'You do not have permission to view analytics for this URL' });
      }
      
      logger.debug(`Serving URL analytics from cache for ${shortCode}, period: ${period}`);
      return res.json(cachedData);
    }
    
    logger.debug(`URL analytics request - ShortCode: ${shortCode}, Period: ${period}, User ID: ${userId || 'none'}`);
    
    // Find URL stats for this shortCode
    const urlStat = await UrlStat.findOne({ shortCode });
    
    if (!urlStat) {
      logger.warn(`URL stats not found for shortCode: ${shortCode}`);
      return res.status(404).json({ error: 'URL not found' });
    }
    
    logger.debug(`Found URL stats: ${JSON.stringify({
      shortCode: urlStat.shortCode,
      userId: urlStat.userId,
      totalClicks: urlStat.totalClicks,
      createdAt: urlStat.createdAt
    })}`);
    
    // If userId is provided, check ownership
    if (userId && urlStat.userId && userId !== urlStat.userId.toString()) {
      logger.warn(`User ${userId} tried to access analytics for URL ${shortCode} owned by ${urlStat.userId}`);
      return res.status(403).json({ error: 'You do not have permission to view analytics for this URL' });
    }
    
    // Set date range filter based on period
    const now = new Date();
    let startDate;
    
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
        startDate = new Date(0);
    }
    
    // Base query for events related to this URL
    const query = { 
      shortCode,
      timestamp: { $gte: startDate }
    };
    
    // Get total clicks for the period
    const totalClicks = await ClickEvent.countDocuments(query);
    
    // Get unique visitors for the period
    const uniqueVisitors = await ClickEvent.distinct('visitorHash', query);
    
    // Get clicks by country
    const clicksByCountry = await ClickEvent.aggregate([
      { $match: query },
      { $group: { _id: '$countryCode', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get clicks by browser
    const clicksByBrowser = await ClickEvent.aggregate([
      { $match: query },
      { $group: { _id: '$browserName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get clicks by device type
    const clicksByDevice = await ClickEvent.aggregate([
      { $match: query },
      { $group: { _id: '$deviceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get clicks by OS
    const clicksByOS = await ClickEvent.aggregate([
      { $match: query },
      { $group: { _id: '$os', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Get clicks by referrer domain
    const clicksByReferer = await ClickEvent.aggregate([
      { $match: query },
      { 
        $addFields: {
          refererDomain: {
            $cond: {
              if: { $eq: ['$referer', 'direct'] },
              then: 'direct',
              else: {
                $let: {
                  vars: { 
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
    
    // Get clicks over time (daily for the selected period)
    const clicksOverTime = await ClickEvent.aggregate([
      { $match: query },
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
    
    // Format the data to match frontend expectations
    const formattedData = {
      shortCode,
      originalUrl: urlStat.originalUrl,
      userId: urlStat.userId, // Include for ownership verification on cached data
      totalClicks: totalClicks,
      uniqueVisitors: uniqueVisitors.length,
      urlCreatedAt: urlStat.createdAt || urlStat.timestamps?.createdAt,
      lastClickAt: urlStat.lastClickAt,
      clicksByCountry: clicksByCountry.map(item => ({
        country: item._id || 'unknown',
        count: item.count
      })),
      clicksByBrowser: clicksByBrowser.map(item => ({
        browser: item._id || 'unknown',
        count: item.count
      })),
      clicksByDevice: clicksByDevice.map(item => ({
        device: item._id || 'unknown',
        count: item.count
      })),
      clicksByOS: clicksByOS.map(item => ({
        os: item._id || 'unknown',
        count: item.count
      })),
      clicksByReferer: clicksByReferer.map(item => ({
        referer: item._id || 'unknown',
        count: item.count
      })),
      clicksOverTime: clicksOverTime.map(item => {
        const date = new Date(
          item._id.year,
          item._id.month - 1, // Month is 0-indexed in JS Date
          item._id.day
        );
        return {
          timestamp: date.toISOString(),
          count: item.count
        };
      })
    };
    
    // Cache the results with period-based expiry
    let cacheExpiry;
    switch (period) {
      case 'day':
        cacheExpiry = 300; // 5 minutes for day view
        break;
      case 'week':
        cacheExpiry = 900; // 15 minutes for week view
        break;
      case 'month':
        cacheExpiry = 1800; // 30 minutes for month view
        break;
      default:
        cacheExpiry = 3600; // 1 hour for year and all views
    }
    
    await cacheService.set(cacheKey, formattedData, cacheExpiry);
    logger.debug(`URL analytics cached for ${shortCode}, period: ${period}`);
    
    logger.debug(`URL analytics prepared for ${shortCode}: ${totalClicks} total clicks, ${uniqueVisitors.length} unique visitors`);
    res.json(formattedData);
  } catch (error) {
    logger.error(`Error in /api/analytics/urls/${req.params.shortCode}:`, error);
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
    const { period = 'week', shortCode } = req.query;
    
    // Check for userId from query parameters or authenticated user
    const userId = req.query.userId || req.user?.id;
    
    // Set date range filter based on period
    const now = new Date();
    let startDate;
    let granularity;
    
    switch (period) {
      case 'day':
        // Last 24 hours, hourly granularity
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        granularity = 'hour';
        break;
      case 'week':
        // Last 7 days, daily granularity
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        granularity = 'day';
        break;
      case 'month':
        // Last 30 days, daily granularity
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        granularity = 'day';
        break;
      case 'year':
        // Last 365 days, monthly granularity
        startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
        granularity = 'month';
        break;
      case 'all':
      default:
        // All time, monthly granularity
        const firstEvent = await ClickEvent.findOne().sort({ timestamp: 1 }).select('timestamp');
        startDate = firstEvent ? new Date(firstEvent.timestamp) : new Date(0);
        granularity = 'month';
    }
    
    // Base query
    let query = {
      timestamp: { $gte: startDate }
    };
    
    // Filter by shortCode if provided
    if (shortCode) {
      query.shortCode = shortCode;
      
      // If userId is provided, verify ownership
      if (userId) {
        const urlStat = await UrlStat.findOne({ shortCode });
        if (urlStat && urlStat.userId && userId !== urlStat.userId.toString()) {
          return res.status(403).json({ error: 'You do not have permission to view analytics for this URL' });
        }
      }
    } 
    // If userId is provided but no shortCode, filter by user's URLs
    else if (userId) {
      const userUrlStats = await UrlStat.find({ userId }).select('shortCode');
      const userShortCodes = userUrlStats.map(stat => stat.shortCode);
      
      if (userShortCodes.length > 0) {
        query.shortCode = { $in: userShortCodes };
      } else {
        // If user has no URLs, return empty results
        return res.json({
          period,
          data: []
        });
      }
    }
    
    // Group by time based on granularity
    const groupStage = {};
    if (granularity === 'hour') {
      groupStage.$group = {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' }
        },
        count: { $sum: 1 }
      };
    } else if (granularity === 'day') {
      groupStage.$group = {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        },
        count: { $sum: 1 }
      };
    } else {
      // monthly
      groupStage.$group = {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' }
        },
        count: { $sum: 1 }
      };
    }
    
    // Aggregate to get clicks over time
    const clicksOverTime = await ClickEvent.aggregate([
      { $match: query },
      groupStage,
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);
    
    // Format the response
    const timeseriesData = clicksOverTime.map(item => {
      let timestamp;
      if (granularity === 'hour') {
        timestamp = new Date(
          item._id.year,
          item._id.month - 1, // Month is 0-indexed in JS Date
          item._id.day,
          item._id.hour
        ).toISOString();
      } else if (granularity === 'day') {
        timestamp = new Date(
          item._id.year,
          item._id.month - 1,
          item._id.day
        ).toISOString();
      } else {
        timestamp = new Date(
          item._id.year,
          item._id.month - 1,
          1
        ).toISOString();
      }
      
      return {
        timestamp,
        count: item.count
      };
    });
    
    res.json({
      period,
      data: timeseriesData
    });
  } catch (error) {
    logger.error('Error in /api/analytics/clicks/timeseries:', error);
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
    const { format = 'json', shortCode } = req.query;
    
    // Check for userId from query parameters or authenticated user
    const userId = req.query.userId || req.user?.id;
    
    // Base query
    let query = {};
    
    // Filter by shortCode if provided
    if (shortCode) {
      query.shortCode = shortCode;
      
      // If userId is provided, verify ownership
      if (userId) {
        const urlStat = await UrlStat.findOne({ shortCode });
        if (urlStat && urlStat.userId && userId !== urlStat.userId.toString()) {
          return res.status(403).json({ error: 'You do not have permission to export analytics for this URL' });
        }
      }
    } 
    // If userId is provided but no shortCode, filter by user's URLs
    else if (userId) {
      const userUrlStats = await UrlStat.find({ userId }).select('shortCode');
      const userShortCodes = userUrlStats.map(stat => stat.shortCode);
      
      if (userShortCodes.length > 0) {
        query.shortCode = { $in: userShortCodes };
      } else {
        // If user has no URLs, return empty results
        return res.json([]);
      }
    }
    
    // Fetch the click events
    const clickEvents = await ClickEvent.find(query).lean();
    
    // Transform data if needed
    const transformedData = clickEvents.map(event => ({
      shortCode: event.shortCode,
      timestamp: event.timestamp,
      ip: event.ip,
      countryCode: event.countryCode,
      city: event.city,
      latitude: event.latitude,
      longitude: event.longitude,
      deviceType: event.deviceType,
      browserName: event.browserName,
      browserVersion: event.browserVersion,
      os: event.os,
      referer: event.referer
    }));
    
    // Format the output based on requested format
    switch (format.toLowerCase()) {
      case 'csv':
        // Convert JSON to CSV
        const fields = Object.keys(transformedData[0] || {});
        const opts = { fields };
        const csv = require('json2csv').parse(transformedData, opts);
        
        res.header('Content-Type', 'text/csv');
        res.attachment(`url-analytics-${shortCode || 'all'}.csv`);
        return res.send(csv);
        
      case 'xlsx':
        // Convert JSON to XLSX
        const XLSX = require('xlsx');
        const ws = XLSX.utils.json_to_sheet(transformedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Click Events");
        
        const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
        
        res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.attachment(`url-analytics-${shortCode || 'all'}.xlsx`);
        return res.send(buffer);
        
      case 'json':
      default:
        res.header('Content-Type', 'application/json');
        res.attachment(`url-analytics-${shortCode || 'all'}.json`);
        return res.json(transformedData);
    }
  } catch (error) {
    logger.error('Error in /api/analytics/export:', error);
    next(error);
  }
});

module.exports = router; 