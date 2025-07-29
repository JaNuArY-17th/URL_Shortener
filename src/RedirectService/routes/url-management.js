const express = require('express');
const router = express.Router();
const Url = require('../models/Url');
const cacheService = require('../services/cacheService');
const logger = require('../services/logger');
const { authenticate, authenticateOptional, isUrlOwner } = require('../middleware/authenticate');
const { v4: uuidv4 } = require('uuid');

/**
 * @swagger
 * /api/urls:
 *   post:
 *     summary: Lưu URL mới
 *     description: Lưu URL mới từ UrlShortenerService vào database
 *     tags:
 *       - URL Management
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Không được xác thực
 *       409:
 *         description: URL với shortCode đã tồn tại
 *       500:
 *         description: Lỗi máy chủ
 *   get:
 *     summary: Get all URLs with pagination
 *     description: Retrieves a list of URLs with pagination
 *     tags:
 *       - URL Management
 *     security:
 *       - bearerAuth: []
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
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by owner user ID
 *     responses:
 *       200:
 *         description: A list of URLs
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', authenticateOptional, async (req, res, next) => {
  try {
    const { shortCode, originalUrl, expiresAt, metadata } = req.body;
    
    // Set userId either from request body or from authenticated user
    // Allowing the system to create URLs directly as needed
    const userId = req.body.userId || req.user?.id || null;
    
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
      userId,
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
 * (Được gộp vào block Swagger phía trên) 
 */
router.get('/', authenticateOptional, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter
    const filter = {};
    
    // Filter by active status if provided
    if (req.query.active !== undefined) {
      filter.active = req.query.active === 'true';
    }
    
    // Filter by userId - either from the query or from authenticated user
    if (req.query.userId) {
      filter.userId = req.query.userId;
    } else if (req.user?.id) {
      // If no specific userId in query but user is authenticated, 
      // only return their URLs
      filter.userId = req.user.id;
    }
    
    // Get sorting parameters
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };
    
    const urls = await Url.find(filter)
      .select('-visitorHistory') // Exclude large fields
      .sort(sortOptions)
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
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not the owner
 *       404:
 *         description: URL not found
 *       500:
 *         description: Server error
 */
router.get('/:shortCode', authenticateOptional, async (req, res, next) => {
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
    
    // If URL has an owner and user is authenticated, verify ownership
    if (url.userId && req.user?.id) {
      const isOwner = url.userId.toString() === req.user.id.toString();
      // If not the owner, admin users might still have access
      if (!isOwner && req.user.role !== 'admin') {
        const isPublic = !req.query.requireOwnership;
        // Allow non-owners to view but note this in the response
        if (!isPublic) {
          const error = new Error('You do not have permission to view this URL details');
          error.statusCode = 403;
          return next(error);
        }
      }
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
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not the owner
 *       404:
 *         description: URL not found
 *       500:
 *         description: Server error
 */
router.put('/:shortCode', authenticate, isUrlOwner, async (req, res, next) => {
  try {
    // URL is already found and ownership verified by isUrlOwner middleware
    const url = req.url;
    const { active, expiresAt, metadata } = req.body;
    
    // Update fields if provided
    if (active !== undefined) {
      url.active = active;
    }
    
    if (expiresAt !== undefined) {
      url.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }
    
    if (metadata) {
      url.metadata = { ...url.metadata, ...metadata };
    }
    
    // Save changes
    const updatedUrl = await url.save();
    
    // Update cache if URL is active
    if (updatedUrl.active) {
      await cacheService.cacheUrl(updatedUrl.shortCode, updatedUrl.originalUrl);
      logger.debug(`Cache updated for URL: ${updatedUrl.shortCode}`);
    } else {
      await cacheService.invalidateUrl(updatedUrl.shortCode);
      logger.debug(`URL removed from cache: ${updatedUrl.shortCode}`);
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
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not the owner
 *       404:
 *         description: URL not found
 *       500:
 *         description: Server error
 */
router.post('/:shortCode/disable', authenticate, isUrlOwner, async (req, res, next) => {
  try {
    // URL is already found and ownership verified by isUrlOwner middleware
    const url = req.url;
    
    // Disable URL
    url.active = false;
    await url.save();
    
    // Remove from cache
    await cacheService.invalidateUrl(url.shortCode);
    logger.info(`URL disabled and removed from cache: ${url.shortCode}`);
    
    res.status(200).json({
      message: 'URL disabled successfully',
      data: url
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/urls/{shortCode}/refresh-cache:
 *   post:
 *     summary: Refresh URL in cache
 *     description: Update the URL in the cache with the latest data from the database
 *     tags:
 *       - URL Management
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not the owner
 *       404:
 *         description: URL not found
 *       500:
 *         description: Server error
 */
router.post('/:shortCode/refresh-cache', authenticate, isUrlOwner, async (req, res, next) => {
  try {
    // URL is already found and ownership verified by isUrlOwner middleware
    const url = req.url;
    
    // Only refresh cache if URL is active
    if (url.active) {
      await cacheService.cacheUrl(url.shortCode, url.originalUrl);
      logger.info(`Cache refreshed for URL: ${url.shortCode}`);
      
      res.status(200).json({
        message: 'Cache refreshed successfully',
        data: {
          shortCode: url.shortCode,
          cached: true
        }
      });
    } else {
      res.status(200).json({
        message: 'URL is inactive, not cached',
        data: {
          shortCode: url.shortCode,
          cached: false
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/urls/{shortCode}/stats:
 *   get:
 *     summary: Get URL statistics
 *     description: Get click statistics for a URL by its short code
 *     tags:
 *       - URL Management
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not the owner
 *       404:
 *         description: URL not found
 *       500:
 *         description: Server error
 */
router.get('/:shortCode/stats', authenticate, isUrlOwner, async (req, res, next) => {
  try {
    // URL is already found and ownership verified by isUrlOwner middleware
    const url = req.url;
    
    // Get basic stats
    const stats = {
      shortCode: url.shortCode,
      originalUrl: url.originalUrl,
      createdAt: url.createdAt,
      clicks: url.clicks,
      uniqueVisitors: url.uniqueVisitors,
      lastAccessedAt: url.lastAccessedAt
    };
    
    res.status(200).json({
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 