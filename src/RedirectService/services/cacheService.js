const Redis = require('ioredis');
const config = require('../config/config');
let redisClient = null;

/**
 * Initialize Redis client
 */
const initRedisClient = async () => {
  try {
    redisClient = new Redis(config.redis.uri);
    
    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
    });
    
    return redisClient;
  } catch (error) {
    console.error('Redis initialization error:', error);
    throw error;
  }
};

/**
 * Get URL from cache
 * @param {string} shortCode 
 * @returns {Promise<string|null>} originalUrl or null if not found
 */
const getUrlFromCache = async (shortCode) => {
  if (!redisClient) {
    return null;
  }
  
  try {
    const originalUrl = await redisClient.get(`url:${shortCode}`);
    return originalUrl;
  } catch (error) {
    console.error('Error getting URL from cache:', error);
    return null;
  }
};

/**
 * Set URL in cache
 * @param {string} shortCode 
 * @param {string} originalUrl 
 * @param {number} expireSeconds Cache expiration in seconds
 * @returns {Promise<boolean>} success or failure
 */
const setUrlInCache = async (shortCode, originalUrl, expireSeconds = config.redis.cacheExpiry) => {
  if (!redisClient) {
    return false;
  }
  
  try {
    await redisClient.set(`url:${shortCode}`, originalUrl, 'EX', expireSeconds);
    return true;
  } catch (error) {
    console.error('Error setting URL in cache:', error);
    return false;
  }
};

/**
 * Delete URL from cache
 * @param {string} shortCode 
 * @returns {Promise<boolean>} success or failure
 */
const deleteUrlFromCache = async (shortCode) => {
  if (!redisClient) {
    return false;
  }
  
  try {
    await redisClient.del(`url:${shortCode}`);
    return true;
  } catch (error) {
    console.error('Error deleting URL from cache:', error);
    return false;
  }
};

module.exports = {
  initRedisClient,
  getUrlFromCache,
  setUrlInCache,
  deleteUrlFromCache
}; 