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
   * Check if cache is connected
   * @returns {boolean} - Connection status
   */
  isConnected() {
    return this.connected && this.client.status === 'ready';
  }

  /**
   * Get a URL from cache
   * @param {string} shortCode - Short code to lookup
   * @returns {Promise<string|null>} - Original URL or null if not found
   */
  async getUrl(shortCode) {
    try {
      if (!this.isConnected()) {
        logger.warn('Redis cache unavailable for getUrl operation');
        this.stats.misses++;
        return null;
      }

      const cacheKey = this._getCacheKey(shortCode);
      const result = await this.client.get(cacheKey);

      // Log cache hit/miss
      if (result) {
        logger.debug(`Cache hit for shortCode: ${shortCode}`);
        this.stats.hits++;
        
        // Extend TTL on cache hit (based on popularity)
        await this._extendCacheTtlIfNeeded(shortCode);
      } else {
        logger.debug(`Cache miss for shortCode: ${shortCode}`);
        this.stats.misses++;
      }

      return result;
    } catch (error) {
      logger.error(`Error getting URL from cache for ${shortCode}:`, error);
      this.stats.errors++;
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Cache a URL with optional tier-based expiration
   * @param {string} shortCode - Short code
   * @param {string} originalUrl - Original URL to cache
   * @param {number} [expiry=null] - Custom expiry time in seconds
   * @param {string} [tier='standard'] - Cache tier (high, standard, low)
   * @returns {Promise<boolean>} - True if cached successfully
   */
  async cacheUrl(shortCode, originalUrl, expiry = null, tier = 'standard') {
    try {
      if (!this.isConnected()) {
        logger.warn('Redis cache unavailable for cacheUrl operation');
        return false;
      }

      const cacheKey = this._getCacheKey(shortCode);
      const expiryTime = expiry || this._getTierExpiry(tier);

      await this.client.set(cacheKey, originalUrl, 'EX', expiryTime);
      logger.debug(`Cached URL for shortCode: ${shortCode}, expires in ${expiryTime}s`);
      
      this.stats.sets++;

      return true;
    } catch (error) {
      logger.error(`Error caching URL for ${shortCode}:`, error);
      this.stats.errors++;
      return false;
    }
  }
  
  /**
   * Cache a popular URL with higher expiration time
   * @param {string} shortCode - Short code
   * @param {string} originalUrl - Original URL to cache
   * @returns {Promise<boolean>} - True if cached successfully
   */
  async cachePopularUrl(shortCode, originalUrl) {
    return this.cacheUrl(shortCode, originalUrl, null, 'high');
  }

  /**
   * Delete a URL from cache
   * @param {string} shortCode - Short code to delete
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  async deleteUrl(shortCode) {
    try {
      if (!this.isConnected()) {
        logger.warn('Redis cache unavailable for deleteUrl operation');
        return false;
      }

      const cacheKey = this._getCacheKey(shortCode);
      await this.client.del(cacheKey);
      logger.debug(`Deleted cached URL for shortCode: ${shortCode}`);
      
      this.stats.deletes++;

      return true;
    } catch (error) {
      logger.error(`Error deleting URL from cache for ${shortCode}:`, error);
      this.stats.errors++;
      return false;
    }
  }
  
  /**
   * Pre-warm cache with popular URLs
   * @param {Array<{shortCode: string, originalUrl: string, popularity: number}>} urls - URLs to cache
   * @returns {Promise<number>} - Number of URLs successfully cached
   */
  async preWarmCache(urls) {
    if (!this.isConnected()) {
      logger.warn('Redis cache unavailable for preWarmCache operation');
      return 0;
    }
    
    let cachedCount = 0;
    
    for (const url of urls) {
      const tier = url.popularity > 100 ? 'high' : 'standard';
      const success = await this.cacheUrl(url.shortCode, url.originalUrl, null, tier);
      if (success) cachedCount++;
    }
    
    logger.info(`Pre-warmed cache with ${cachedCount}/${urls.length} URLs`);
    return cachedCount;
  }

  /**
   * Get the cache statistics
   * @returns {Promise<Object>} - Cache statistics
   */
  async getStats() {
    try {
      if (!this.isConnected()) {
        logger.warn('Redis cache unavailable for getStats operation');
        return { available: false };
      }

      const info = await this.client.info();
      const memory = await this.client.info('memory');
      const stats = await this.client.info('stats');
      const dbSize = await this.client.dbsize();
      
      // Calculate hit rate
      const totalLookups = this.stats.hits + this.stats.misses;
      const hitRate = totalLookups > 0 ? (this.stats.hits / totalLookups * 100).toFixed(2) : 0;

      return {
        available: true,
        status: this.client.status,
        info: this._parseRedisInfo(info),
        memory: this._parseRedisInfo(memory),
        stats: this._parseRedisInfo(stats),
        dbSize,
        serviceStats: {
          ...this.stats,
          hitRate: `${hitRate}%`,
          totalOperations: this.stats.hits + this.stats.misses + this.stats.sets + this.stats.deletes
        }
      };
    } catch (error) {
      logger.error('Error getting Redis stats:', error);
      this.stats.errors++;
      return { available: false, error: error.message };
    }
  }

  /**
   * Close the Redis connection
   */
  async close() {
    if (this.client) {
      logger.info('Closing Redis connection');
      await this.client.quit();
      this.connected = false;
    }
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
   * Extend TTL for frequently accessed URLs
   * @private
   * @param {string} shortCode - Short code
   */
  async _extendCacheTtlIfNeeded(shortCode) {
    try {
      const cacheKey = this._getCacheKey(shortCode);
      const ttl = await this.client.ttl(cacheKey);
      
      // If TTL is less than half the standard expiry, extend it
      if (ttl > 0 && ttl < (config.redis.cacheExpiry / 2)) {
        await this.client.expire(cacheKey, config.redis.cacheExpiry);
        logger.debug(`Extended TTL for frequently accessed URL: ${shortCode}`);
      }
    } catch (error) {
      logger.error(`Error extending TTL for ${shortCode}:`, error);
    }
  }

  /**
   * Generate a cache key from a short code
   * @private
   * @param {string} shortCode - Short code
   * @returns {string} - Cache key
   */
  _getCacheKey(shortCode) {
    return `url:${shortCode}`;
  }
  
  /**
   * Get tier-based expiry time
   * @private
   * @param {string} tier - Cache tier
   * @returns {number} - Expiry time in seconds
   */
  _getTierExpiry(tier) {
    switch (tier) {
      case 'high':
        return config.redis.cacheExpiry * 3; // 3x standard time for popular URLs
      case 'low':
        return Math.floor(config.redis.cacheExpiry / 2); // Half standard time for less popular
      case 'standard':
      default:
        return config.redis.cacheExpiry;
    }
  }

  /**
   * Parse Redis info response
   * @private
   * @param {string} info - Redis info response
   * @returns {Object} - Parsed info
   */
  _parseRedisInfo(info) {
    const result = {};

    if (!info) return result;

    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key.trim()] = value.trim();
        }
      }
    }

    return result;
  }
}

module.exports = new CacheService(); 