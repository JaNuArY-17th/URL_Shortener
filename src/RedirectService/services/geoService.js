/**
 * GeoService - Service for geo location processing and handling
 * 
 * Note: For production use, replace the basic geolocation with a real geolocation service
 * like MaxMind GeoIP2, IP2Location, etc.
 */
const logger = require('./logger');
const cacheService = require('./cacheService');
const Redis = require('ioredis');

class GeoService {
  constructor() {
    this.geoCache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.countryRedirects = new Map();
  }

  /**
   * Initialize geo redirect rules
   * @param {Object} rules - Rules mapping country codes to redirect URLs
   */
  initRedirectRules(rules) {
    // Clear existing rules
    this.countryRedirects.clear();
    
    // Set new rules
    Object.entries(rules).forEach(([shortCode, countryRules]) => {
      this.countryRedirects.set(shortCode, countryRules);
    });
    
    logger.info(`Initialized geo redirect rules for ${this.countryRedirects.size} URLs`);
  }

  /**
   * Add or update geo redirect rule for a URL
   * @param {string} shortCode - Short URL code
   * @param {Object} countryRules - Rules mapping country codes to redirect URLs
   */
  setRedirectRule(shortCode, countryRules) {
    this.countryRedirects.set(shortCode, countryRules);
    logger.debug(`Updated geo redirect rules for ${shortCode}`);
    return true;
  }

  /**
   * Remove geo redirect rule for a URL
   * @param {string} shortCode - Short URL code
   */
  removeRedirectRule(shortCode) {
    const result = this.countryRedirects.delete(shortCode);
    if (result) {
      logger.debug(`Removed geo redirect rules for ${shortCode}`);
    }
    return result;
  }

  /**
   * Get all redirect rules
   * @returns {Object} All redirect rules
   */
  getAllRedirectRules() {
    const rules = {};
    this.countryRedirects.forEach((value, key) => {
      rules[key] = value;
    });
    return rules;
  }

  /**
   * Get redirect rules for a specific URL
   * @param {string} shortCode - Short URL code
   * @returns {Object|null} Redirect rules for the URL or null if not found
   */
  getRedirectRule(shortCode) {
    return this.countryRedirects.get(shortCode) || null;
  }

  /**
   * Get country code from IP address (mocked)
   * @param {string} ip - IP address
   * @returns {Promise<string>} Country code
   */
  async getCountryFromIp(ip) {
    try {
      // Check if we already have this IP in cache
      if (this.geoCache.has(ip)) {
        const cachedData = this.geoCache.get(ip);
        
        // Check if cache is still valid
        if (Date.now() - cachedData.timestamp < this.cacheExpiry) {
          return cachedData.country;
        }
      }

      // In a real implementation, this would call an external geo-ip service
      // For now, we'll create a deterministic mapping based on the IP
      // This is just for demonstration purposes
      const country = this._mockCountryLookup(ip);
      
      // Store in cache
      this.geoCache.set(ip, {
        country,
        timestamp: Date.now()
      });
      
      return country;
    } catch (error) {
      logger.error('Error determining country from IP:', error);
      return 'XX'; // Unknown country code
    }
  }

  /**
   * Check if a URL should be redirected based on country
   * @param {string} shortCode - Short URL code
   * @param {string} countryCode - Country code
   * @returns {string|null} Redirect URL or null if no redirect needed
   */
  getCountryRedirect(shortCode, countryCode) {
    const rules = this.countryRedirects.get(shortCode);
    
    if (!rules) {
      return null; // No geo rules for this URL
    }
    
    // Check for exact country match
    if (rules[countryCode]) {
      logger.debug(`Country redirect found for ${shortCode} (${countryCode}): ${rules[countryCode]}`);
      return rules[countryCode];
    }
    
    // Check for region match (first character of country code)
    const region = countryCode.charAt(0);
    if (rules[`${region}*`]) {
      logger.debug(`Region redirect found for ${shortCode} (${region}*): ${rules[`${region}*`]}`);
      return rules[`${region}*`];
    }
    
    // Check for default
    if (rules['default']) {
      return rules['default'];
    }
    
    return null;
  }

  /**
   * Mock country lookup based on IP
   * @private
   * @param {string} ip - IP address
   * @returns {string} Country code
   */
  _mockCountryLookup(ip) {
    // This is a deterministic mock implementation
    // In production, replace with a real geo-IP service
    const countryCodes = [
      'US', 'GB', 'FR', 'DE', 'JP', 'CN', 'BR', 'AU', 
      'CA', 'IN', 'RU', 'IT', 'ES', 'MX', 'KR', 'ID'
    ];
    
    // Generate a simple hash of the IP
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      hash = ((hash << 5) - hash) + ip.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Use hash to select a country code
    const index = Math.abs(hash) % countryCodes.length;
    return countryCodes[index];
  }
}

module.exports = new GeoService(); 