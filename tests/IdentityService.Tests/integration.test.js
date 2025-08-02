const request = require('supertest');
const mongoose = require('mongoose');
const amqplib = require('amqplib');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Import services
const authApp = require('../../src/AuthService/server');
const notificationApp = require('../../src/NotificationService/server');
const User = require('../../src/AuthService/models/User');
const EmailVerification = require('../../src/AuthService/models/EmailVerification');
const Notification = require('../../src/NotificationService/models/Notification');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/test_integration?retryWrites=true&w=majority&appName=Cluster1';
const RABBITMQ_URI = process.env.RABBITMQ_URI || 'amqps://irnrcdfe:i8Sii2DlRiD1u2fobfw_gIuEuQa-z-4f@chimpanzee.rmq.cloudamqp.com/irnrcdfe';
const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

describe('AuthService and NotificationService Integration', () => {
  let authServer;
  let notificationServer;
  let connection;
  let channel;
  
  // Test data
  const testUser = {
    email: `test.${uuidv4()}@example.com`,
    password: 'TestPassword123!',
    username: `testuser_${uuidv4().substring(0, 8)}`,
    fullName: 'Test User'
  };

  // Setup before all tests
  beforeAll(async () => {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);

    // Connect to RabbitMQ
    connection = await amqplib.connect(RABBITMQ_URI);
    channel = await connection.createChannel();

    // Setup exchanges and queues
    await channel.assertExchange('user-events', 'topic', { durable: true });
    await channel.assertQueue('notification-user-events', { durable: true });
    await channel.bindQueue(
      'notification-user-events',
      'user-events',
      'user.#'
    );

    // Start servers
    authServer = authApp.listen(5001);
    notificationServer = notificationApp.listen(5005);

    // Wait for servers to start
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 30000);

  // Cleanup after all tests
  afterAll(async () => {
    // Close servers
    await new Promise(resolve => authServer.close(resolve));
    await new Promise(resolve => notificationServer.close(resolve));

    // Clean up database
    await User.deleteMany({ email: testUser.email });
    await EmailVerification.deleteMany({ email: testUser.email });
    await Notification.deleteMany({ recipientEmail: testUser.email });

    // Close RabbitMQ connection
    await channel.close();
    await connection.close();

    // Close MongoDB connection
    await mongoose.disconnect();
  }, 15000);

  // Setup before each test
  beforeEach(async () => {
    // Clean up user data
    await User.deleteMany({ email: testUser.email });
    await EmailVerification.deleteMany({ email: testUser.email });
    await Notification.deleteMany({ recipientEmail: testUser.email });
  });

  describe('User Registration Flow', () => {
    it('should register user and trigger welcome notification', async () => {
      // Register a new user
      const response = await request(authApp)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Verify successful registration
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify notification was created
      const notifications = await Notification.find({ 
        recipientEmail: testUser.email,
        type: 'WELCOME' 
      });

      expect(notifications.length).toBeGreaterThanOrEqual(1);
      
      if (notifications.length > 0) {
        const notification = notifications[0];
        expect(notification.title).toContain('Welcome');
        expect(notification.status).toBe('SENT');
      }
    }, 10000);

    it('should create verification token on registration', async () => {
      // Register a new user
      await request(authApp)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify verification token was created
      const verificationRecord = await EmailVerification.findOne({ email: testUser.email });
      expect(verificationRecord).toBeTruthy();
      
      // Verify notification for email verification was sent
      const notifications = await Notification.find({ 
        recipientEmail: testUser.email,
        type: 'EMAIL_VERIFICATION' 
      });

      expect(notifications.length).toBeGreaterThanOrEqual(1);
    }, 5000);
  });

  describe('Password Reset Flow', () => {
    it('should trigger password reset notification', async () => {
      // First register a user
      await request(authApp)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Request password reset
      await request(authApp)
        .post('/api/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify password reset notification was created
      const notifications = await Notification.find({ 
        recipientEmail: testUser.email,
        type: 'PASSWORD_RESET' 
      });

      expect(notifications.length).toBeGreaterThanOrEqual(1);
    }, 8000);
  });

  describe('Authentication and JWT', () => {
    it('should login user and return valid JWT token', async () => {
      // First register a user
      await request(authApp)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Login the user
      const loginResponse = await request(authApp)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      // Verify token in response
      expect(loginResponse.body).toHaveProperty('token');
      const token = loginResponse.body.token;
      
      // Verify JWT is valid
      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded).toHaveProperty('id');
      expect(decoded).toHaveProperty('email', testUser.email);

      // Use token to access a protected route
      const meResponse = await request(authApp)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify returned user data
      expect(meResponse.body).toHaveProperty('email', testUser.email);
    }, 5000);
  });
}); 