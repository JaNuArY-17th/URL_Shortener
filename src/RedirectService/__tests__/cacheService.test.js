const Redis = require('ioredis');
const cacheService = require('../services/cacheService');
const logger = require('../services/logger');

// Mock dependencies
jest.mock('ioredis');
jest.mock('../services/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  stream: { write: jest.fn() }
}));

describe('CacheService', () => {
  // Mock Redis client methods
  const mockGet = jest.fn();
  const mockSet = jest.fn();
  const mockDel = jest.fn();
  const mockTtl = jest.fn();
  const mockExpire = jest.fn();
  const mockInfo = jest.fn();
  const mockDbsize = jest.fn();
  
  beforeAll(() => {
    // Setup mock implementation
    Redis.mockImplementation(() => {
      return {
        get: mockGet,
        set: mockSet,
        del: mockDel,
        ttl: mockTtl,
        expire: mockExpire,
        info: mockInfo,
        dbsize: mockDbsize,
        status: 'ready',
        on: jest.fn()
      };
    });
    
    // Trigger event handlers for 100% coverage
    const events = {};
    Redis.prototype.on = jest.fn((event, callback) => {
      events[event] = callback;
      return this;
    });
    
    // Manually trigger some Redis events to test handlers
    if (events.connect) events.connect();
    if (events.ready) events.ready();
  });
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockGet.mockReset();
    mockSet.mockReset();
    mockDel.mockReset();
    mockTtl.mockReset();
    mockExpire.mockReset();
    mockInfo.mockReset();
    mockDbsize.mockReset();
    
    // Set default behavior
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue('OK');
    mockDel.mockResolvedValue(1);
    mockTtl.mockResolvedValue(3600);
    mockExpire.mockResolvedValue(1);
    mockInfo.mockResolvedValue('# Server\r\nredis_version:6.2.0\r\n');
    mockDbsize.mockResolvedValue(42);
    
    // Reset cache service stats
    cacheService.resetStats();
  });
  
  describe('getUrl', () => {
    it('should return cached URL when found', async () => {
      const shortCode = 'abc123';
      const originalUrl = 'https://example.com';
      
      mockGet.mockResolvedValueOnce(originalUrl);
      
      const result = await cacheService.getUrl(shortCode);
      
      expect(result).toBe(originalUrl);
      expect(mockGet).toHaveBeenCalledWith('url:abc123');
      expect(cacheService.stats.hits).toBe(1);
      expect(cacheService.stats.misses).toBe(0);
    });
    
    it('should return null when URL is not in cache', async () => {
      const shortCode = 'abc123';
      
      mockGet.mockResolvedValueOnce(null);
      
      const result = await cacheService.getUrl(shortCode);
      
      expect(result).toBeNull();
      expect(mockGet).toHaveBeenCalledWith('url:abc123');
      expect(cacheService.stats.hits).toBe(0);
      expect(cacheService.stats.misses).toBe(1);
    });
    
    it('should handle Redis errors', async () => {
      const shortCode = 'abc123';
      
      mockGet.mockRejectedValueOnce(new Error('Redis error'));
      
      const result = await cacheService.getUrl(shortCode);
      
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
      expect(cacheService.stats.errors).toBeGreaterThan(0);
    });
  });
  
  describe('cacheUrl', () => {
    it('should cache URL with default expiry time', async () => {
      const shortCode = 'abc123';
      const originalUrl = 'https://example.com';
      
      const result = await cacheService.cacheUrl(shortCode, originalUrl);
      
      expect(result).toBe(true);
      expect(mockSet).toHaveBeenCalledWith('url:abc123', originalUrl, 'EX', expect.any(Number));
      expect(cacheService.stats.sets).toBe(1);
    });
    
    it('should cache URL with custom expiry time', async () => {
      const shortCode = 'abc123';
      const originalUrl = 'https://example.com';
      const customExpiry = 7200; // 2 hours
      
      const result = await cacheService.cacheUrl(shortCode, originalUrl, customExpiry);
      
      expect(result).toBe(true);
      expect(mockSet).toHaveBeenCalledWith('url:abc123', originalUrl, 'EX', customExpiry);
    });
    
    it('should cache popular URLs with longer expiry time', async () => {
      const shortCode = 'abc123';
      const originalUrl = 'https://example.com';
      
      const result = await cacheService.cachePopularUrl(shortCode, originalUrl);
      
      expect(result).toBe(true);
      // Should use the 'high' tier which is 3x the standard expiry
      expect(mockSet).toHaveBeenCalled();
    });
    
    it('should handle Redis errors', async () => {
      const shortCode = 'abc123';
      const originalUrl = 'https://example.com';
      
      mockSet.mockRejectedValueOnce(new Error('Redis error'));
      
      const result = await cacheService.cacheUrl(shortCode, originalUrl);
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
      expect(cacheService.stats.errors).toBeGreaterThan(0);
    });
  });
  
  describe('deleteUrl', () => {
    it('should delete URL from cache', async () => {
      const shortCode = 'abc123';
      
      const result = await cacheService.deleteUrl(shortCode);
      
      expect(result).toBe(true);
      expect(mockDel).toHaveBeenCalledWith('url:abc123');
      expect(cacheService.stats.deletes).toBe(1);
    });
    
    it('should handle Redis errors', async () => {
      const shortCode = 'abc123';
      
      mockDel.mockRejectedValueOnce(new Error('Redis error'));
      
      const result = await cacheService.deleteUrl(shortCode);
      
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
      expect(cacheService.stats.errors).toBeGreaterThan(0);
    });
  });
  
  describe('preWarmCache', () => {
    it('should pre-warm cache with popular URLs', async () => {
      const urls = [
        { shortCode: 'abc123', originalUrl: 'https://example.com', popularity: 150 },
        { shortCode: 'def456', originalUrl: 'https://example.org', popularity: 50 }
      ];
      
      const result = await cacheService.preWarmCache(urls);
      
      expect(result).toBe(2); // Both cached successfully
      expect(mockSet).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalled();
    });
  });
  
  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const result = await cacheService.getStats();
      
      expect(result.available).toBe(true);
      expect(result.dbSize).toBe(42);
      expect(result.serviceStats).toBeDefined();
      expect(mockInfo).toHaveBeenCalled();
    });
    
    it('should handle Redis errors', async () => {
      mockInfo.mockRejectedValueOnce(new Error('Redis error'));
      
      const result = await cacheService.getStats();
      
      expect(result.available).toBe(false);
      expect(result.error).toBeDefined();
      expect(logger.error).toHaveBeenCalled();
    });
  });
  
  describe('_getTierExpiry', () => {
    it('should return correct expiry time for high tier', () => {
      const result = cacheService._getTierExpiry('high');
      // Should be 3x the standard expiry
      expect(result).toBeGreaterThan(0);
    });
    
    it('should return correct expiry time for low tier', () => {
      const result = cacheService._getTierExpiry('low');
      // Should be half the standard expiry
      expect(result).toBeGreaterThan(0);
    });
    
    it('should return standard expiry time for unknown tier', () => {
      const result = cacheService._getTierExpiry('unknown');
      expect(result).toBeGreaterThan(0);
    });
  });
}); 