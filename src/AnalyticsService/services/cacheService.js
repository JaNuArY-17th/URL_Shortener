const Redis = require('ioredis');
const config = require('../config/config');
const logger = require('./logger');

class CacheService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.initialize();
    
    // Cache stats tracking
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      lastReset: new Date()
    };
    
    // Start interval to reset stats daily
    setInterval(() => {
      this.resetStats();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  initialize() {
    try {
      // Only initialize if caching is enabled
      if (!config.features.enableCaching) {
        logger.info('Redis caching is disabled in configuration');
        return;
      }
      
      // Create Redis client with reconnect strategy
      this.client = new Redis(config.redis.uri, {
        retryStrategy: config.redis.reconnectStrategy,
        enableOfflineQueue: true,
        connectTimeout: 10000, // 10 seconds
        maxRetriesPerRequest: 3
      });

      // Handle connection events
      this.client.on('connect', () => {
        this.connected = true;
        logger.info('Connected to Redis');
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
      });

      this.client.on('error', (err) => {
        logger.error('Redis error:', err);
        this.connected = false;
        this.stats.errors++;
      });

      this.client.on('reconnecting', (time) => {
        logger.info(`Reconnecting to Redis in ${time}ms`);
      });

      this.client.on('close', () => {
        logger.warn('Redis connection closed');
        this.connected = false;
      });

      this.client.on('end', () => {
        logger.warn('Redis connection ended');
        this.connected = false;
      });

    } catch (error) {
      logger.error('Failed to initialize Redis:', error);
      this.connected = false;
      this.stats.errors++;
    }
  }

  /**
   * Check if cache is connected and enabled
   * @returns {boolean} - Connection status
   */
  isConnected() {
    return config.features.enableCaching && this.connected && this.client && this.client.status === 'ready';
  }

  /**
   * Get an item from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Cached data or null if not found
   */
  async get(key) {
    try {
      if (!this.isConnected()) {
        logger.debug('Redis cache unavailable for get operation');
        this.stats.misses++;
        return null;
      }

      const result = await this.client.get(key);

      // Log cache hit/miss and update stats
      if (result) {
        logger.debug(`Cache hit for key: ${key}`);
        this.stats.hits++;
        
        // Try to parse JSON if the result is a JSON string
        try {
          return JSON.parse(result);
        } catch (e) {
          return result;
        }
      } else {
        logger.debug(`Cache miss for key: ${key}`);
        this.stats.misses++;
      }

      return null;
    } catch (error) {
      logger.error(`Error getting item from cache for ${key}:`, error);
      this.stats.errors++;
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set an item in cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} [expiry=null] - Custom expiry time in seconds
   * @returns {Promise<boolean>} - True if cached successfully
   */
  async set(key, data, expiry = null) {
    try {
      if (!this.isConnected()) {
        logger.debug('Redis cache unavailable for set operation');
        return false;
      }

      const expiryTime = expiry || config.redis.cacheExpiry;
      
      // Convert object or array data to JSON string
      const dataToStore = typeof data === 'object' ? JSON.stringify(data) : data;

      await this.client.set(key, dataToStore, 'EX', expiryTime);
      logger.debug(`Cached data for key: ${key}, expires in ${expiryTime}s`);
      
      this.stats.sets++;
      return true;
    } catch (error) {
      logger.error(`Error caching data for ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Delete an item from cache
   * @param {string} key - Cache key to delete
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  async delete(key) {
    try {
      if (!this.isConnected()) {
        logger.debug('Redis cache unavailable for delete operation');
        return false;
      }

      await this.client.del(key);
      logger.debug(`Deleted cached item for key: ${key}`);
      
      this.stats.deletes++;
      return true;
    } catch (error) {
      logger.error(`Error deleting item from cache for ${key}:`, error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - True if key exists
   */
  async exists(key) {
    try {
      if (!this.isConnected()) {
        return false;
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking existence for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get the cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    if (!this.isConnected()) {
      return { 
        available: false,
        enabled: config.features.enableCaching
      };
    }

    // Calculate hit rate
    const totalLookups = this.stats.hits + this.stats.misses;
    const hitRate = totalLookups > 0 ? (this.stats.hits / totalLookups * 100).toFixed(2) : 0;

    return {
      available: true,
      enabled: config.features.enableCaching,
      status: this.client.status,
      stats: {
        ...this.stats,
        hitRate: `${hitRate}%`,
        totalOperations: this.stats.hits + this.stats.misses + this.stats.sets + this.stats.deletes
      }
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      lastReset: new Date()
    };
    logger.debug('Cache statistics reset');
  }

  /**
   * Close the Redis connection
   */
  async close() {
    if (this.client && this.isConnected()) {
      logger.info('Closing Redis connection');
      await this.client.quit();
      this.connected = false;
    }
  }

  /**
   * Generate a general cache key for URL analytics data
   * @param {string} shortCode - Short code of the URL
   * @param {string} type - Type of analytics (e.g., 'overview', 'details')
   * @param {Object} [params] - Additional parameters for the key
   * @returns {string} - Cache key
   */
  generateAnalyticsKey(shortCode, type, params = {}) {
    let key = `analytics:${shortCode}:${type}`;
    
    // Add additional parameters to the key if provided
    if (Object.keys(params).length > 0) {
      const paramString = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .sort()
        .join(':');
      key += `:${paramString}`;
    }
    
    return key;
  }
}

// Create a singleton instance
const cacheService = new CacheService();

module.exports = cacheService; 