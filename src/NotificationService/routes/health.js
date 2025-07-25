const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const logger = require('../services/logger');
const messageHandler = require('../services/messageHandler');
const emailService = require('../services/emailService');
const socketService = require('../services/socketService');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Basic health check
 *     description: Verify that the API is running
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2023-06-23T11:21:15.000Z
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'notification-service',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/health/deep:
 *   get:
 *     summary: Deep health check
 *     description: Check connectivity to all dependencies (MongoDB, RabbitMQ, Email)
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: All systems are operational
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2023-06-23T11:21:15.000Z
 *                 services:
 *                   type: object
 *                   properties:
 *                     mongodb:
 *                       type: string
 *                       example: connected
 *                     rabbitmq:
 *                       type: string
 *                       example: connected
 *                     email:
 *                       type: string
 *                       example: ready
 *                     socketio:
 *                       type: string
 *                       example: connected
 *       500:
 *         description: Some services are not operational
 */
router.get('/deep', async (req, res) => {
  // Check MongoDB connection
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  // Check RabbitMQ connection
  const rabbitStatus = messageHandler.isConnected() ? 'connected' : 'disconnected';
  
  // Check email service
  const emailStatus = emailService.isReady() ? 'ready' : 'not_configured';
  
  // Check Socket.IO status
  const socketStatus = socketService.isConnected() ? 'connected' : 'not_initialized';

  // Overall status
  const overallStatus = mongoStatus === 'connected' && rabbitStatus === 'connected' ? 'ok' : 'degraded';

  // HTTP status code
  const statusCode = overallStatus === 'ok' ? 200 : 500;

  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoStatus,
      rabbitmq: rabbitStatus,
      email: emailStatus,
      socketio: socketStatus
    }
  });
});

/**
 * @swagger
 * /api/health/stats:
 *   get:
 *     summary: Service statistics
 *     description: Get runtime statistics for the service
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uptime:
 *                   type: number
 *                   example: 3600
 *                 memory:
 *                   type: object
 *                   properties:
 *                     rss:
 *                       type: string
 *                       example: 50MB
 *                     heapTotal:
 *                       type: string
 *                       example: 30MB
 *                     heapUsed:
 *                       type: string
 *                       example: 20MB
 *                 socketio:
 *                   type: object
 *                   properties:
 *                     connectedClients:
 *                       type: number
 *                       example: 42
 */
router.get('/stats', async (req, res) => {
  // System uptime
  const uptime = process.uptime();
  
  // Memory usage
  const formatMemoryUsage = (data) => `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;
  const memoryData = process.memoryUsage();
  const memory = {
    rss: formatMemoryUsage(memoryData.rss),         // Total memory allocated
    heapTotal: formatMemoryUsage(memoryData.heapTotal), // Total size of allocated heap
    heapUsed: formatMemoryUsage(memoryData.heapUsed),  // Actual memory used
    external: formatMemoryUsage(memoryData.external)   // V8 external memory
  };
  
  // Get Socket.IO stats
  const socketioStats = {
    enabled: socketService.isConnected(),
    connectedClients: socketService.getConnectedClientsCount()
  };
  
  res.json({
    uptime: Math.floor(uptime),
    memory,
    socketio: socketioStats,
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      cpuUsage: process.cpuUsage()
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/health/test-email:
 *   post:
 *     summary: Send test email
 *     description: Send a test email to verify email service is working
 *     tags:
 *       - Health
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Test email sent
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Email service error
 */
router.post('/test-email', async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email address is required'
      });
    }
    
    // Check if email service is configured
    if (!emailService.isReady()) {
      return res.status(500).json({
        status: 'error',
        message: 'Email service is not configured'
      });
    }
    
    // Send test email
    await emailService.sendTestEmail(email);
    
    res.status(200).json({
      status: 'success',
      message: `Test email sent to ${email}`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 