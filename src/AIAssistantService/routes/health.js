const express = require('express');
const router = express.Router();
const config = require('../config/config');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Basic health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AI Assistant Service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

/**
 * @swagger
 * /api/health/deep:
 *   get:
 *     summary: Deep health check including dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health status
 */
router.get('/deep', async (req, res) => {
  const health = {
    status: 'healthy',
    service: 'AI Assistant Service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    dependencies: {}
  };

  try {
    // Check AI service
    const geminiService = req.app.locals.geminiService;
    if (geminiService && config.ai.geminiApiKey) {
      health.dependencies.geminiAI = { status: 'connected' };
    } else {
      health.dependencies.geminiAI = { status: 'not_configured' };
    }

    // Check data service
    const dataService = req.app.locals.dataService;
    if (dataService) {
      health.dependencies.dataService = { status: 'connected' };
    } else {
      health.dependencies.dataService = { status: 'disconnected' };
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    health.system = {
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
      },
      nodeVersion: process.version
    };

    res.json(health);
  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
    res.status(503).json(health);
  }
});

module.exports = router;