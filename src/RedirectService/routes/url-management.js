const express = require('express');
const router = express.Router();
const Url = require('../models/Url');
const cacheService = require('../services/cacheService');
const logger = require('../services/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * @swagger
 * /api/urls:
 *   post:
 *     summary: Lưu URL mới
 *     description: Lưu URL mới từ UrlShortenerService vào database
 *     tags:
 *       - URL Management
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shortCode
 *               - originalUrl
 *             properties:
 *               shortCode:
 *                 type: string
 *                 description: Mã rút gọn đã được tạo từ UrlShortenerService
 *               originalUrl:
 *                 type: string
 *                 description: URL gốc cần rút gọn
 *               userId:
 *                 type: string
 *                 description: ID của người dùng tạo URL
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Thời gian hết hạn của URL (tùy chọn)
 *               metadata:
 *                 type: object
 *                 description: Thông tin mở rộng của URL (tùy chọn)
 *                 properties:
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *     responses:
 *       201:
 *         description: URL đã được lưu thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       409:
 *         description: URL với shortCode đã tồn tại
 *       500:
 *         description: Lỗi máy chủ
 */
router.post('/', async (req, res, next) => {
  try {
    const { shortCode, originalUrl, userId, expiresAt, metadata } = req.body;
    
    // Validate input
    if (!shortCode || !originalUrl) {
      const error = new Error('shortCode và originalUrl là bắt buộc');
      error.statusCode = 400;
      return next(error);
    }
    
    // Check if shortCode already exists
    const existingUrl = await Url.findOne({ shortCode });
    if (existingUrl) {
      const error = new Error(`URL với shortCode ${shortCode} đã tồn tại`);
      error.statusCode = 409;
      return next(error);
    }
    
    // Create new URL
    const url = new Url({
      shortCode,
      originalUrl,
      userId: userId || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      metadata: metadata || {}
    });
    
    // Save to database
    const savedUrl = await url.save();
    logger.info(`URL mới đã được lưu: ${shortCode}`, { 
      shortCode,
      originalUrl,
      userId,
      requestId: req.id || uuidv4()
    });
    
    // Cache the URL
    await cacheService.cacheUrl(shortCode, originalUrl);
    logger.debug(`URL đã được thêm vào cache: ${shortCode}`);
    
    res.status(201).json({
      message: 'URL đã được lưu thành công',
      data: savedUrl
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/urls:
 *   get:
 *     summary: Get all URLs with pagination
 *     description: Retrieves a list of URLs with pagination
 *     tags:
 *       - URL Management
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: A list of URLs
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const filter = {};
    if (req.query.active !== undefined) {
      filter.active = req.query.active === 'true';
    }
    
    const urls = await Url.find(filter)
      .select('-visitorHistory') // Exclude large fields
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
      
    const total = await Url.countDocuments(filter);
    
    res.setHeader('X-Total-Count', total);
    res.status(200).json({
      data: urls,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/urls/{shortCode}:
 *   get:
 *     summary: Get URL details
 *     description: Get detailed information about a URL by its short code
 *     tags:
 *       - URL Management
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         description: Short code of the URL
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: URL details
 *       404:
 *         description: URL not found
 *       500:
 *         description: Server error
 */
router.get('/:shortCode', async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    
    // Try to get from cache for statistics, but we still need the full record
    // so we query the database regardless
    const cachedUrl = await cacheService.getUrl(shortCode);
    
    const url = await Url.findOne({ shortCode })
      .select('-visitorHistory'); // Exclude large fields
      
    if (!url) {
      const error = new Error(`URL with short code ${shortCode} not found`);
      error.statusCode = 404;
      return next(error);
    }
    
    res.status(200).json({
      data: url,
      cache: {
        hit: !!cachedUrl,
        exists: !!cachedUrl
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/urls/{shortCode}:
 *   put:
 *     summary: Update URL
 *     description: Update URL details by its short code
 *     tags:
 *       - URL Management
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         description: Short code of the URL
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               active:
 *                 type: boolean
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               metadata:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: URL updated successfully
 *       404:
 *         description: URL not found
 *       500:
 *         description: Server error
 */
router.put('/:shortCode', async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const { active, expiresAt, metadata } = req.body;
    
    const url = await Url.findOne({ shortCode });
    
    if (!url) {
      const error = new Error(`URL with short code ${shortCode} not found`);
      error.statusCode = 404;
      return next(error);
    }
    
    // Update fields
    if (active !== undefined) url.active = active;
    if (expiresAt) url.expiresAt = new Date(expiresAt);
    if (metadata) url.metadata = { ...url.metadata, ...metadata };
    
    const updatedUrl = await url.save();
    logger.info(`URL ${shortCode} updated`, { shortCode, requestId: req.id });
    
    // Update cache if URL is active, otherwise remove from cache
    if (updatedUrl.active) {
      await cacheService.cacheUrl(shortCode, updatedUrl.originalUrl);
      logger.debug(`Updated URL in cache: ${shortCode}`);
    } else {
      await cacheService.deleteUrl(shortCode);
      logger.debug(`Removed inactive URL from cache: ${shortCode}`);
    }
    
    res.status(200).json({
      message: 'URL updated successfully',
      data: updatedUrl
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/urls/{shortCode}/disable:
 *   post:
 *     summary: Disable URL
 *     description: Disable a URL by its short code
 *     tags:
 *       - URL Management
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         description: Short code of the URL
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: URL disabled successfully
 *       404:
 *         description: URL not found
 *       500:
 *         description: Server error
 */
router.post('/:shortCode/disable', async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    
    const url = await Url.findOne({ shortCode });
    
    if (!url) {
      const error = new Error(`URL with short code ${shortCode} not found`);
      error.statusCode = 404;
      return next(error);
    }
    
    url.active = false;
    await url.save();
    
    // Remove from cache since it's inactive
    await cacheService.deleteUrl(shortCode);
    logger.info(`URL ${shortCode} disabled and removed from cache`, { 
      shortCode, 
      requestId: req.id 
    });
    
    res.status(200).json({
      message: 'URL disabled successfully',
      data: { shortCode, active: false }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/urls/{shortCode}/stats:
 *   get:
 *     summary: Get URL statistics
 *     description: Get click statistics for a URL
 *     tags:
 *       - URL Management
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         description: Short code of the URL
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: URL statistics
 *       404:
 *         description: URL not found
 *       500:
 *         description: Server error
 */
router.get('/:shortCode/stats', async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    
    const url = await Url.findOne({ shortCode })
      .select('shortCode originalUrl clicks uniqueVisitors createdAt lastAccessedAt');
      
    if (!url) {
      const error = new Error(`URL with short code ${shortCode} not found`);
      error.statusCode = 404;
      return next(error);
    }
    
    // Check if URL is in cache
    const isCached = !!(await cacheService.getUrl(shortCode));
    
    // Calculate time-to-live in cache if it exists
    let cacheTtl = null;
    if (isCached) {
      const ttl = await cacheService.client.ttl(`url:${shortCode}`);
      cacheTtl = ttl > 0 ? ttl : null;
    }
    
    const stats = {
      shortCode: url.shortCode,
      originalUrl: url.originalUrl,
      clicks: url.clicks,
      uniqueVisitors: url.uniqueVisitors,
      createdAt: url.createdAt,
      lastAccessedAt: url.lastAccessedAt,
      cache: {
        exists: isCached,
        ttl: cacheTtl
      },
      // Add more detailed stats as needed
    };
    
    res.status(200).json({ data: stats });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/urls/{shortCode}/refresh-cache:
 *   post:
 *     summary: Refresh cache for URL
 *     description: Force refresh the cache for a specific URL
 *     tags:
 *       - URL Management
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         description: Short code of the URL
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cache refreshed successfully
 *       404:
 *         description: URL not found
 *       500:
 *         description: Server error
 */
router.post('/:shortCode/refresh-cache', async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const requestId = req.id || uuidv4();
    
    const url = await Url.findOne({ shortCode });
    
    if (!url) {
      const error = new Error(`URL with short code ${shortCode} not found`);
      error.statusCode = 404;
      return next(error);
    }
    
    if (!url.active) {
      const error = new Error(`URL with short code ${shortCode} is inactive`);
      error.statusCode = 400;
      return next(error);
    }
    
    // Delete from cache first if exists
    await cacheService.deleteUrl(shortCode);
    
    // Add to cache
    const success = await cacheService.cacheUrl(shortCode, url.originalUrl);
    
    if (success) {
      logger.info(`Cache refreshed for URL ${shortCode}`, { shortCode, requestId });
      res.status(200).json({
        message: 'Cache refreshed successfully',
        data: { shortCode, cached: true }
      });
    } else {
      const error = new Error(`Failed to refresh cache for URL ${shortCode}`);
      error.statusCode = 500;
      return next(error);
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router; 