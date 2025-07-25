const express = require('express');
const router = express.Router();
const Url = require('../models/Url');
const { getUrlFromCache, setUrlInCache } = require('../services/cacheService');
const { publishRedirectEvent } = require('../services/messageHandler');

/**
 * @route   GET /:shortCode
 * @desc    Redirect to original URL from short code
 * @access  Public
 */
router.get('/:shortCode', async (req, res) => {
  const { shortCode } = req.params;
  
  if (!shortCode) {
    return res.status(400).json({ message: 'Short code is required' });
  }

  try {
    // First try to get URL from cache
    const cachedUrl = await getUrlFromCache(shortCode);
    
    if (cachedUrl) {
      // Record redirect event asynchronously
      try {
        const redirectEvent = {
          shortCode,
          timestamp: new Date().toISOString(),
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          referer: req.headers.referer || ''
        };
        
        publishRedirectEvent(redirectEvent);
      } catch (eventError) {
        console.error('Error publishing redirect event:', eventError);
      }

      return res.redirect(cachedUrl);
    }

    // If not in cache, look up in database
    const urlDoc = await Url.findOne({ shortCode, isActive: true });

    if (!urlDoc) {
      return res.status(404).json({ message: 'URL not found or inactive' });
    }

    // Check if URL has expired
    if (urlDoc.expiresAt && urlDoc.expiresAt < new Date()) {
      return res.status(410).json({ message: 'URL has expired' });
    }

    // Update click statistics
    urlDoc.clickCount += 1;
    urlDoc.lastClickedAt = new Date();
    await urlDoc.save();

    // Add to cache for future requests
    await setUrlInCache(shortCode, urlDoc.originalUrl);

    // Record redirect event asynchronously
    try {
      const redirectEvent = {
        shortCode,
        originalUrl: urlDoc.originalUrl,
        userId: urlDoc.userId.toString(),
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        referer: req.headers.referer || ''
      };
      
      publishRedirectEvent(redirectEvent);
    } catch (eventError) {
      console.error('Error publishing redirect event:', eventError);
    }

    // Redirect to original URL
    return res.redirect(urlDoc.originalUrl);
  } catch (error) {
    console.error('Error redirecting:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 