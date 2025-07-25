const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const cacheService = require('../services/cacheService');
const messageHandler = require('../services/messageHandler');
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
 *                   example: redirect-service
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
    service: 'redirect-service',
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
 *                   example: redirect-service
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
 *                     redis:
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
    redis: 'disconnected',
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
    // Check Redis connection
    if (cacheService.isConnected()) {
      const redisStats = await cacheService.getStats();
      if (redisStats.available) {
        dependencies.redis = 'connected';
      } else {
        isHealthy = false;
      }
    } else {
      isHealthy = false;
    }
  } catch (error) {
    logger.error('Redis health check failed:', error);
    isHealthy = false;
  }

  try {
    // Check RabbitMQ connection
    if (messageHandler.isConnected()) {
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
      service: 'redirect-service',
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

/**
 * @swagger
 * /api/health/stats:
 *   get:
 *     summary: Service statistics
 *     description: Returns statistics about the service
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service statistics retrieved successfully
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = {
      service: 'redirect-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      redis: await cacheService.getStats()
    };
    
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
});

module.exports = router; 