const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Url = require('../models/Url');
const cacheService = require('../services/cacheService');
const messageHandler = require('../services/messageHandler');
const redirectRoutes = require('../routes/redirect');
const { errorHandler } = require('../middleware/error-handler');

// Mock dependencies
jest.mock('../models/Url');
jest.mock('../services/cacheService');
jest.mock('../services/messageHandler');
jest.mock('../services/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  stream: { write: jest.fn() }
}));

describe('Redirect Routes', () => {
  let app;
  
  beforeAll(() => {
    // Create express app for testing
    app = express();
    app.use(express.json());
    app.use('/', redirectRoutes);
    app.use(errorHandler);
  });
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set default behaviors
    cacheService.getUrl.mockResolvedValue(null);
    cacheService.cacheUrl.mockResolvedValue(true);
    messageHandler.publishRedirectEvent.mockResolvedValue(true);
  });
  
  describe('GET /:shortCode', () => {
    it('should redirect to original URL when found in cache', async () => {
      const shortCode = 'abc123';
      const originalUrl = 'https://example.com';
      
      // Mock cache hit
      cacheService.getUrl.mockResolvedValueOnce(originalUrl);
      
      const response = await request(app)
        .get(`/${shortCode}`)
        .expect(302); // Redirect status
      
      expect(response.headers.location).toBe(originalUrl);
      expect(cacheService.getUrl).toHaveBeenCalledWith(shortCode);
      expect(cacheService.cacheUrl).not.toHaveBeenCalled(); // No need to cache again
    });
    
    it('should redirect to original URL when found in database', async () => {
      const shortCode = 'abc123';
      const originalUrl = 'https://example.com';
      
      // Mock cache miss but database hit
      cacheService.getUrl.mockResolvedValueOnce(null);
      
      // Mock Url model
      Url.findOne.mockResolvedValueOnce({
        shortCode,
        originalUrl,
        active: true,
        incrementClicks: jest.fn().mockResolvedValue({})
      });
      
      const response = await request(app)
        .get(`/${shortCode}`)
        .expect(302); // Redirect status
        
      expect(response.headers.location).toBe(originalUrl);
      expect(cacheService.getUrl).toHaveBeenCalledWith(shortCode);
      expect(Url.findOne).toHaveBeenCalledWith({ shortCode });
      expect(cacheService.cacheUrl).toHaveBeenCalledWith(shortCode, originalUrl);
    });
    
    it('should return 404 when URL not found', async () => {
      const shortCode = 'nonexistent';
      
      // Mock cache miss and database miss
      cacheService.getUrl.mockResolvedValueOnce(null);
      Url.findOne.mockResolvedValueOnce(null);
      
      const response = await request(app)
        .get(`/${shortCode}`)
        .expect(404); // Not found
        
      expect(response.body).toHaveProperty('status', 'error');
      expect(cacheService.getUrl).toHaveBeenCalledWith(shortCode);
      expect(Url.findOne).toHaveBeenCalledWith({ shortCode });
      expect(cacheService.cacheUrl).not.toHaveBeenCalled();
    });
    
    it('should return 410 when URL is inactive', async () => {
      const shortCode = 'inactive';
      
      // Mock cache miss but database hit with inactive URL
      cacheService.getUrl.mockResolvedValueOnce(null);
      Url.findOne.mockResolvedValueOnce({
        shortCode,
        originalUrl: 'https://example.com',
        active: false
      });
      
      const response = await request(app)
        .get(`/${shortCode}`)
        .expect(410); // Gone
        
      expect(response.body).toHaveProperty('status', 'error');
      expect(cacheService.getUrl).toHaveBeenCalledWith(shortCode);
      expect(Url.findOne).toHaveBeenCalledWith({ shortCode });
      expect(cacheService.cacheUrl).not.toHaveBeenCalled();
    });
    
    it('should handle errors properly', async () => {
      const shortCode = 'error';
      
      // Mock error
      cacheService.getUrl.mockRejectedValueOnce(new Error('Test error'));
      
      const response = await request(app)
        .get(`/${shortCode}`)
        .expect(500); // Internal server error
        
      expect(response.body).toHaveProperty('status', 'error');
    });
    
    it('should update click statistics and publish event', async () => {
      const shortCode = 'abc123';
      const originalUrl = 'https://example.com';
      
      // Mock cache hit
      cacheService.getUrl.mockResolvedValueOnce(originalUrl);
      
      // Create mock incrementClicks function
      const mockIncrementClicks = jest.fn().mockResolvedValue({});
      
      // Mock URL model for statistics update
      Url.findOne.mockImplementation(async () => {
        return {
          shortCode,
          originalUrl,
          active: true,
          incrementClicks: mockIncrementClicks
        };
      });
      
      await request(app)
        .get(`/${shortCode}`)
        .set('User-Agent', 'test-agent')
        .set('Referer', 'https://test-referer.com')
        .expect(302); // Redirect status
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Check that click statistics were updated
      expect(Url.findOne).toHaveBeenCalled();
      expect(mockIncrementClicks).toHaveBeenCalled();
      
      // Check that event was published
      expect(messageHandler.publishRedirectEvent).toHaveBeenCalled();
      expect(messageHandler.publishRedirectEvent.mock.calls[0][0]).toHaveProperty('shortCode', shortCode);
    });
  });
}); 