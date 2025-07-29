const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const Url = require('../models/Url');
const cacheService = require('../services/cacheService');
const geoService = require('../services/geoService');
const { publishRedirectEvent } = require('../services/messageHandler');
const logger = require('../services/logger');
const config = require('../config/config');

// Rate limiter for redirect endpoints
const redirectLimiter = rateLimit({
  windowMs: config.rateLimit.redirect.windowMs,
  max: config.rateLimit.redirect.max,
  message: config.rateLimit.redirect.message,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || 'unknown';
  },
  skip: (req) => {
    // Skip rate limiting for health checks and swagger docs
    return req.path.startsWith('/api/health') || req.path.startsWith('/api-docs');
  }
});

/**
 * @swagger
 * /{shortCode}:
 *   get:
 *     summary: Redirect to original URL
 *     description: Takes a short code and redirects to the original URL
 *     tags:
 *       - Redirect
 *     parameters:
 *       - in: path
 *         name: shortCode
 *         required: true
 *         description: Short code to redirect
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Successful redirection
 *       404:
 *         description: URL not found
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server error
 */
router.get('/:shortCode', redirectLimiter, async (req, res, next) => {
  const { shortCode } = req.params;
  const requestId = req.id;
  const startTime = Date.now();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Hash visitor IP for privacy
  const visitorHash = hashVisitorIdentifier(req);
  
  try {
    logger.info(`Processing redirect for shortCode: ${shortCode}`, { 
      requestId, 
      shortCode 
    });

    // 1. Try to get URL from cache first
    let originalUrl = await cacheService.getUrl(shortCode);
    let fromCache = true;

    // 2. If not in cache, look up in database
    let urlDoc;
    if (!originalUrl) {
      fromCache = false;
      logger.debug(`Cache miss for ${shortCode}, checking database`, { requestId });
      
      urlDoc = await Url.findOne({ shortCode });
      
      if (!urlDoc) {
        logger.warn(`Short URL not found: ${shortCode}`, { requestId });
        const error = new Error(`Short URL not found: ${shortCode}`);
        error.statusCode = 404;
        return next(error);
      }
      
      if (!urlDoc.active) {
        logger.warn(`Short URL is deactivated: ${shortCode}`, { requestId });
        const error = new Error(`This URL has been deactivated`);
        error.statusCode = 410; // Gone
        return next(error);
      }
      
      originalUrl = urlDoc.originalUrl;
      
      // 3. Cache the result for future requests
      await cacheService.cacheUrl(shortCode, originalUrl);
      logger.debug(`URL cached after database lookup: ${shortCode}`, { requestId });
    }

    // 4. Check for geo targeting
    let redirectUrl = originalUrl;
    if (config.features && config.features.geoTargeting) {
      try {
        // Get the visitor's country code
        const countryCode = await geoService.getCountryFromIp(ip);
        
        // Check if we have a geo-specific redirect for this URL and country
        const geoRedirect = geoService.getCountryRedirect(shortCode, countryCode);
        if (geoRedirect) {
          logger.info(`Geo-targeting redirect: ${shortCode} -> ${countryCode}`, {
            shortCode,
            countryCode,
            requestId
          });
          redirectUrl = geoRedirect;
        }
      } catch (geoError) {
        // Continue with the original URL if geo lookup fails
        logger.error('Geo-targeting error:', {
          error: geoError.message,
          shortCode,
          requestId
        });
      }
    }

    // 5. Async update click statistics
    updateClickStatistics(shortCode, visitorHash, req)
      .catch(err => logger.error('Failed to update click statistics', {
        error: err.message,
        shortCode,
        requestId
      }));

    // 6. Track performance
    const responseTime = Date.now() - startTime;
    logger.info(`Redirecting to ${redirectUrl}`, { 
      requestId,
      shortCode,
      fromCache,
      responseTime,
      geoTargeted: redirectUrl !== originalUrl
    });

    // 7. Redirect the user
    res.redirect(redirectUrl);
  } catch (error) {
    logger.error('Error processing redirect:', {
      error: error.message,
      stack: error.stack,
      shortCode,
      requestId
    });
    next(error);
  }
});

/**
 * Hash visitor identifier for privacy
 * @private
 * @param {Object} req - Express request
 * @returns {string} - Hashed visitor identifier
 */
function hashVisitorIdentifier(req) {
  const identifier = `${req.ip}-${req.headers['user-agent'] || 'unknown'}`;
  return crypto.createHash('sha256').update(identifier).digest('hex');
}

/**
 * Update click statistics in database and publish event
 * @private
 * @param {string} shortCode - Short code
 * @param {string} visitorHash - Hashed visitor identifier
 * @param {Object} req - Express request
 * @returns {Promise<void>}
 */
async function updateClickStatistics(shortCode, visitorHash, req) {
  try {
    // Find URL in database
    const urlDoc = await Url.findOne({ shortCode });
    
    if (!urlDoc) {
      logger.warn(`Failed to update click statistics - URL not found: ${shortCode}`);
      return;
    }
    
    // Get country code for analytics
    let countryCode = 'XX';
    if (config.features && config.features.geoTargeting) {
      try {
        countryCode = await geoService.getCountryFromIp(req.ip || 'unknown');
      } catch (error) {
        logger.debug('Error getting country code for analytics:', error.message);
      }
    }
    
    // Increment click count
    await urlDoc.incrementClicks(visitorHash);
    
    // Publish redirect event for analytics
    const redirectEventData = {
      shortCode,
      originalUrl: urlDoc.originalUrl,
      userId: urlDoc.userId, // Include userId for real-time notifications
      visitorHash,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'] || 'unknown',
      referer: req.headers.referer || 'direct',
      ipHash: crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex'),
      countryCode
    };
    
    await publishRedirectEvent(redirectEventData);
    
  } catch (error) {
    logger.error('Error updating click statistics:', {
      error: error.message,
      shortCode
    });
    // We don't throw here to avoid affecting the user's redirect experience
  }
}

module.exports = router; 