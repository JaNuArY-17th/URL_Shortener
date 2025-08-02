const mongoose = require('mongoose');
const amqplib = require('amqplib');
const request = require('supertest');
const Redis = require('ioredis');

// Import services
const redirectApp = require('../../src/RedirectService/server');
const analyticsApp = require('../../src/AnalyticsService/server');
const { ClickEvent } = require('../../src/AnalyticsService/models/ClickEvent');
const { UrlStat } = require('../../src/AnalyticsService/models/UrlStat');
const Url = require('../../src/RedirectService/models/Url');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/test_integration?retryWrites=true&w=majority&appName=Cluster1';
const RABBITMQ_URI = process.env.RABBITMQ_URI || 'amqps://irnrcdfe:i8Sii2DlRiD1u2fobfw_gIuEuQa-z-4f@chimpanzee.rmq.cloudamqp.com/irnrcdfe';
const REDIS_URI = process.env.REDIS_URI || 'redis://localhost:6379';

// Test data
const TEST_SHORT_CODE = 'testintg';
const TEST_ORIGINAL_URL = 'https://example.com/integration-test';
const TEST_USER_ID = '507f1f77bcf86cd799439011';

describe('RedirectService and AnalyticsService Integration', () => {
  let redirectServer;
  let analyticsServer;
  let connection;
  let channel;
  let redisClient;

  // Setup before all tests
  beforeAll(async () => {
    // Connect to MongoDB with unique database for integration tests
    await mongoose.connect(MONGODB_URI);

    // Connect to RabbitMQ
    connection = await amqplib.connect(RABBITMQ_URI);
    channel = await connection.createChannel();

    // Setup exchanges and queues
    await channel.assertExchange('url-shortener-events', 'topic', { durable: true });
    await channel.assertQueue('analytics-redirect-events', { durable: true });
    await channel.bindQueue(
      'analytics-redirect-events',
      'url-shortener-events',
      'url.redirect'
    );

    // Connect to Redis
    redisClient = new Redis(REDIS_URI);

    // Start servers
    redirectServer = redirectApp.listen(5003);
    analyticsServer = analyticsApp.listen(5004);

    // Wait for servers to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 30000); // Increased timeout for setup

  // Cleanup after all tests
  afterAll(async () => {
    // Close servers
    await new Promise(resolve => redirectServer.close(resolve));
    await new Promise(resolve => analyticsServer.close(resolve));

    // Clean up database
    await Url.deleteMany({});
    await ClickEvent.deleteMany({});
    await UrlStat.deleteMany({});

    // Clean up Redis
    await redisClient.flushdb();
    await redisClient.quit();

    // Close RabbitMQ connection
    await channel.close();
    await connection.close();

    // Close MongoDB connection
    await mongoose.disconnect();
  }, 15000);

  // Setup before each test
  beforeEach(async () => {
    // Clean up database
    await Url.deleteMany({});
    await ClickEvent.deleteMany({});
    await UrlStat.deleteMany({});

    // Clean up Redis
    await redisClient.flushdb();

    // Create test URL in RedirectService database
    await Url.create({
      shortCode: TEST_SHORT_CODE,
      originalUrl: TEST_ORIGINAL_URL,
      userId: TEST_USER_ID,
      active: true,
      createdAt: new Date()
    });
  });

  describe('End-to-end redirect flow with analytics', () => {
    it('should redirect user and record analytics event', async () => {
      // 1. Make request to redirect service
      await request(redirectApp)
        .get(`/${TEST_SHORT_CODE}`)
        .set('User-Agent', 'Integration-Test-Agent')
        .set('Referer', 'https://test-source.com')
        .expect(302) // Expect redirect
        .expect('Location', TEST_ORIGINAL_URL);

      // 2. Wait for event to be processed by analytics service
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3. Verify that analytics data was stored
      const clickEvents = await ClickEvent.find({ shortCode: TEST_SHORT_CODE });
      expect(clickEvents.length).toBeGreaterThanOrEqual(1);
      
      if (clickEvents.length > 0) {
        const clickEvent = clickEvents[0];
        expect(clickEvent.originalUrl).toBe(TEST_ORIGINAL_URL);
        expect(clickEvent.referer).toBe('https://test-source.com');
      }

      // 4. Verify URL stats were updated
      const urlStat = await UrlStat.findOne({ shortCode: TEST_SHORT_CODE });
      expect(urlStat).toBeTruthy();
      
      if (urlStat) {
        expect(urlStat.originalUrl).toBe(TEST_ORIGINAL_URL);
        expect(urlStat.totalClicks).toBeGreaterThanOrEqual(1);
      }
    }, 10000); // Increased timeout for async operations

    it('should handle multiple redirects and update statistics correctly', async () => {
      // Make multiple requests
      const numberOfRequests = 3;
      
      for (let i = 0; i < numberOfRequests; i++) {
        await request(redirectApp)
          .get(`/${TEST_SHORT_CODE}`)
          .set('User-Agent', `Integration-Test-Agent-${i}`)
          .set('Referer', `https://test-source-${i}.com`)
          .expect(302);
          
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Wait for events to be processed
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify click events
      const clickEvents = await ClickEvent.find({ shortCode: TEST_SHORT_CODE });
      expect(clickEvents.length).toBeGreaterThanOrEqual(numberOfRequests);

      // Verify URL stats
      const urlStat = await UrlStat.findOne({ shortCode: TEST_SHORT_CODE });
      expect(urlStat).toBeTruthy();
      
      if (urlStat) {
        expect(urlStat.totalClicks).toBeGreaterThanOrEqual(numberOfRequests);
      }
    }, 15000);

    it('should update analytics when redirecting from cache', async () => {
      // First request to populate the cache
      await request(redirectApp)
        .get(`/${TEST_SHORT_CODE}`)
        .expect(302);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Clear analytics data but keep the cache
      await ClickEvent.deleteMany({});
      await UrlStat.deleteMany({});
      
      // Verify URL is in Redis cache
      const cachedUrl = await redisClient.get(`url:${TEST_SHORT_CODE}`);
      expect(cachedUrl).toBe(TEST_ORIGINAL_URL);
      
      // Make another request (should come from cache)
      await request(redirectApp)
        .get(`/${TEST_SHORT_CODE}`)
        .expect(302);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify analytics were still updated
      const clickEvents = await ClickEvent.find({ shortCode: TEST_SHORT_CODE });
      expect(clickEvents.length).toBeGreaterThanOrEqual(1);
      
      const urlStat = await UrlStat.findOne({ shortCode: TEST_SHORT_CODE });
      expect(urlStat).toBeTruthy();
    }, 10000);
  });

  describe('Error handling', () => {
    it('should handle non-existent short codes properly', async () => {
      // Request non-existent code
      await request(redirectApp)
        .get('/nonexistent')
        .expect(404);
        
      // Wait for any potential processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify no analytics events for non-existent shortcode
      const clickEvents = await ClickEvent.find({ shortCode: 'nonexistent' });
      expect(clickEvents.length).toBe(0);
    });
    
    it('should not update analytics for inactive URLs', async () => {
      // Create an inactive URL
      await Url.create({
        shortCode: 'inactive',
        originalUrl: 'https://example.com/inactive',
        userId: TEST_USER_ID,
        active: false
      });
      
      // Request the inactive URL
      await request(redirectApp)
        .get('/inactive')
        .expect(410); // Gone
        
      // Wait for any potential processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify no analytics events for inactive URL
      const clickEvents = await ClickEvent.find({ shortCode: 'inactive' });
      expect(clickEvents.length).toBe(0);
    });
  });
}); 