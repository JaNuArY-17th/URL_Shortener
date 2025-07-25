const express = require('express');
const router = express.Router();
const Url = require('../models/Url');
const logger = require('../services/logger');
const mongoose = require('mongoose');

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
 *       500:
 *         description: Server error
 */
router.get('/overview', async (req, res, next) => {
  try {
    const period = req.query.period || 'week';
    let dateFilter = {};
    
    const now = new Date();
    
    // Set date range filter based on period
    switch (period) {
      case 'day':
        // Last 24 hours
        dateFilter = { 
          lastAccessedAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } 
        };
        break;
      case 'week':
        // Last 7 days
        dateFilter = { 
          lastAccessedAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } 
        };
        break;
      case 'month':
        // Last 30 days
        dateFilter = { 
          lastAccessedAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } 
        };
        break;
      case 'year':
        // Last 365 days
        dateFilter = { 
          lastAccessedAt: { $gte: new Date(now - 365 * 24 * 60 * 60 * 1000) } 
        };
        break;
      case 'all':
      default:
        // All time, no date filter
        dateFilter = {};
    }
    
    // Get total clicks
    const totalClicks = await Url.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, totalClicks: { $sum: '$clicks' } } }
    ]);
    
    // Get total unique visitors
    const uniqueVisitors = await Url.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, totalVisitors: { $sum: '$uniqueVisitors' } } }
    ]);
    
    // Get total URLs
    const totalUrls = await Url.countDocuments();
    
    // Get active URLs
    const activeUrls = await Url.countDocuments({ active: true });
    
    // Get top 10 URLs by clicks
    const topUrls = await Url.find(dateFilter)
      .sort({ clicks: -1 })
      .limit(10)
      .select('shortCode originalUrl clicks uniqueVisitors lastAccessedAt');
      
    // Get URL creation over time
    const urlCreationOverTime = await Url.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.json({
      data: {
        period,
        summary: {
          totalClicks: totalClicks.length > 0 ? totalClicks[0].totalClicks : 0,
          uniqueVisitors: uniqueVisitors.length > 0 ? uniqueVisitors[0].totalVisitors : 0,
          totalUrls,
          activeUrls,
          inactiveUrls: totalUrls - activeUrls,
          clicksPerUrl: totalClicks.length > 0 && totalUrls > 0 ? 
            (totalClicks[0].totalClicks / totalUrls).toFixed(2) : 0
        },
        topUrls,
        urlCreationOverTime: urlCreationOverTime.map(item => ({
          period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          count: item.count
        }))
      }
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
 *       500:
 *         description: Server error
 */
router.get('/urls/:shortCode', async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const period = req.query.period || 'month';
    
    // Find the URL
    const url = await Url.findOne({ shortCode });
    
    if (!url) {
      const error = new Error(`URL with short code ${shortCode} not found`);
      error.statusCode = 404;
      return next(error);
    }
    
    // Basic analytics
    const analytics = {
      shortCode: url.shortCode,
      originalUrl: url.originalUrl,
      createdAt: url.createdAt,
      totalClicks: url.clicks,
      uniqueVisitors: url.uniqueVisitors,
      lastAccessed: url.lastAccessedAt,
      isActive: url.active
    };
    
    // More detailed analytics could be added here in a real implementation
    // For example, clicks over time, referrers, user agents, etc.
    
    res.json({ data: analytics });
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
 *       500:
 *         description: Server error
 */
router.get('/clicks/timeseries', async (req, res, next) => {
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
      lastAccessedAt: { $gte: startDate }
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
              year: { $year: '$lastAccessedAt' },
              month: { $month: '$lastAccessedAt' },
              day: { $dayOfMonth: '$lastAccessedAt' },
              hour: { $hour: '$lastAccessedAt' }
            },
            clicks: { $sum: '$clicks' }
          }
        };
        break;
      case 'day':
        groupStage = {
          $group: {
            _id: {
              year: { $year: '$lastAccessedAt' },
              month: { $month: '$lastAccessedAt' },
              day: { $dayOfMonth: '$lastAccessedAt' }
            },
            clicks: { $sum: '$clicks' }
          }
        };
        break;
      case 'week':
        groupStage = {
          $group: {
            _id: {
              year: { $year: '$lastAccessedAt' },
              week: { $week: '$lastAccessedAt' }
            },
            clicks: { $sum: '$clicks' }
          }
        };
        break;
      case 'month':
      default:
        groupStage = {
          $group: {
            _id: {
              year: { $year: '$lastAccessedAt' },
              month: { $month: '$lastAccessedAt' }
            },
            clicks: { $sum: '$clicks' }
          }
        };
    }
    
    // This is a simplified implementation
    // In a real application, you would use actual click events with timestamps
    // For this example, we'll just use the URL's click count and last accessed date
    // Note: This is not accurate for real analytics but serves as a placeholder
    
    // Mock implementation - in real app, would query from a clicks collection
    // with actual timestamps for each click
    const mockTimeSeries = [];
    
    // Generate time series data based on the current date and period
    let currentDate = new Date(startDate);
    while (currentDate <= now) {
      mockTimeSeries.push({
        timestamp: new Date(currentDate),
        clicks: Math.floor(Math.random() * 100) // Random data for demonstration
      });
      
      // Increment date based on period
      switch (period) {
        case 'hour':
          currentDate.setHours(currentDate.getHours() + 1);
          break;
        case 'day':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'week':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'month':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
    }
    
    res.json({
      data: {
        shortCode: shortCode || 'all',
        period,
        range,
        timeSeries: mockTimeSeries.map(item => ({
          timestamp: item.timestamp.toISOString(),
          clicks: item.clicks
        }))
      }
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
 *     description: Export analytics data in CSV format
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
 *       500:
 *         description: Server error
 */
router.get('/export', async (req, res, next) => {
  try {
    const { shortCode, format = 'csv' } = req.query;
    
    // Parse dates, defaulting to last 30 days if not provided
    const now = new Date();
    const startDate = req.query.start ? new Date(req.query.start) : new Date(now - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end ? new Date(req.query.end) : now;
    
    // Build query
    const query = {
      lastAccessedAt: {
        $gte: startDate,
        $lte: endDate
      }
    };
    
    if (shortCode) {
      query.shortCode = shortCode;
    }
    
    // Get URLs
    const urls = await Url.find(query)
      .select('shortCode originalUrl clicks uniqueVisitors createdAt lastAccessedAt active')
      .sort({ clicks: -1 });
      
    if (format === 'json') {
      return res.json({ data: urls });
    } else {
      // Generate CSV
      let csv = 'shortCode,originalUrl,clicks,uniqueVisitors,createdAt,lastAccessedAt,active\n';
      
      urls.forEach(url => {
        csv += `${url.shortCode},${url.originalUrl.replace(',', '%2C')},${url.clicks},${url.uniqueVisitors},${url.createdAt.toISOString()},${url.lastAccessedAt ? url.lastAccessedAt.toISOString() : ''},${url.active}\n`;
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=url-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
      res.send(csv);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router; 