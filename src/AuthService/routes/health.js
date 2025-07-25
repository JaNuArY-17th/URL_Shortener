const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { connectRabbitMQ } = require('../services/messagePublisher');
const logger = require('../services/logger');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Basic health check
 *     description: Returns basic service status
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: auth-service
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'auth-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * @swagger
 * /api/health/deep:
 *   get:
 *     summary: Deep health check
 *     description: Checks connectivity to all dependencies
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: All dependencies are healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: auth-service
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 dependencies:
 *                   type: object
 *                   properties:
 *                     mongodb:
 *                       type: string
 *                       example: connected
 *                     rabbitmq:
 *                       type: string
 *                       example: connected
 *       503:
 *         description: One or more dependencies are unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Service unavailable
 *                 dependencies:
 *                   type: object
 */
router.get('/deep', async (req, res) => {
  const dependencies = {
    mongodb: 'disconnected',
    rabbitmq: 'disconnected'
  };

  let isHealthy = true;

  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState === 1) {
      // 1 = connected
      await mongoose.connection.db.admin().ping();
      dependencies.mongodb = 'connected';
    } else {
      isHealthy = false;
    }
  } catch (error) {
    logger.error('MongoDB health check failed:', error);
    isHealthy = false;
  }

  try {
    // Check RabbitMQ connection
    const rabbitChannel = await connectRabbitMQ();
    if (rabbitChannel) {
      dependencies.rabbitmq = 'connected';
    } else {
      isHealthy = false;
    }
  } catch (error) {
    logger.error('RabbitMQ health check failed:', error);
    isHealthy = false;
  }

  if (isHealthy) {
    return res.status(200).json({
      status: 'ok',
      service: 'auth-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      dependencies
    });
  } else {
    return res.status(503).json({
      status: 'error',
      message: 'Service unavailable',
      dependencies
    });
  }
});

module.exports = router; 