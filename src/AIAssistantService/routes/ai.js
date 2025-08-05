const express = require('express');
const router = express.Router();
const logger = require('../services/logger');

/**
 * @swagger
 * /api/ai/tools:
 *   get:
 *     summary: Get available AI tools
 *     tags: [AI Tools]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of available AI tools
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tools:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       parameters:
 *                         type: object
 */
router.get('/tools', async (req, res) => {
  try {
    const geminiService = req.app.locals.geminiService;
    const tools = geminiService.getAvailableTools();
    
    res.json({
      tools,
      count: tools.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting AI tools:', error);
    res.status(500).json({ error: 'Failed to get AI tools' });
  }
});

/**
 * @swagger
 * /api/ai/analyze/url:
 *   post:
 *     summary: Analyze URL performance with AI insights
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shortCode
 *             properties:
 *               shortCode:
 *                 type: string
 *                 description: Short code of the URL to analyze
 *               timeRange:
 *                 type: string
 *                 enum: [1d, 7d, 30d, 90d]
 *                 default: 7d
 *     responses:
 *       200:
 *         description: AI analysis of URL performance
 */
router.post('/analyze/url', async (req, res) => {
  try {
    const { shortCode, timeRange = '7d' } = req.body;
    
    if (!shortCode) {
      return res.status(400).json({ error: 'shortCode is required' });
    }

    const geminiService = req.app.locals.geminiService;
    const analysis = await geminiService.analyzeUrlPerformance({ shortCode, timeRange });
    
    if (analysis.error) {
      return res.status(404).json({ error: analysis.error });
    }

    res.json(analysis);
  } catch (error) {
    logger.error('Error analyzing URL:', error);
    res.status(500).json({ error: 'Failed to analyze URL' });
  }
});

/**
 * @swagger
 * /api/ai/insights/system:
 *   get:
 *     summary: Get comprehensive system insights
 *     tags: [AI Insights]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 30d, 90d]
 *           default: 7d
 *       - in: query
 *         name: includeRecommendations
 *         schema:
 *           type: boolean
 *           default: true
 *     responses:
 *       200:
 *         description: AI-powered system insights
 */
router.get('/insights/system', async (req, res) => {
  try {
    const { timeRange = '7d', includeRecommendations = 'true' } = req.query;
    
    const geminiService = req.app.locals.geminiService;
    const insights = await geminiService.getSystemInsights({ 
      timeRange, 
      includeRecommendations: includeRecommendations === 'true' 
    });
    
    if (insights.error) {
      return res.status(500).json({ error: insights.error });
    }

    res.json(insights);
  } catch (error) {
    logger.error('Error getting system insights:', error);
    res.status(500).json({ error: 'Failed to get system insights' });
  }
});

/**
 * @swagger
 * /api/ai/analyze/users:
 *   get:
 *     summary: Analyze user behavior patterns (anonymized)
 *     tags: [AI Analysis]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: segment
 *         schema:
 *           type: string
 *           enum: [all, active, new, power_users]
 *           default: all
 *     responses:
 *       200:
 *         description: AI analysis of user behavior patterns
 */
router.get('/analyze/users', async (req, res) => {
  try {
    const { segment = 'all' } = req.query;
    
    const geminiService = req.app.locals.geminiService;
    const analysis = await geminiService.analyzeUserBehavior({ segment });
    
    if (analysis.error) {
      return res.status(500).json({ error: analysis.error });
    }

    res.json(analysis);
  } catch (error) {
    logger.error('Error analyzing user behavior:', error);
    res.status(500).json({ error: 'Failed to analyze user behavior' });
  }
});

/**
 * @swagger
 * /api/ai/suggestions/url:
 *   post:
 *     summary: Generate smart URL suggestions
 *     tags: [AI Suggestions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - originalUrl
 *             properties:
 *               originalUrl:
 *                 type: string
 *                 description: The original URL to analyze
 *               context:
 *                 type: string
 *                 description: Additional context about the URL usage
 *     responses:
 *       200:
 *         description: AI-generated URL suggestions
 */
router.post('/suggestions/url', async (req, res) => {
  try {
    const { originalUrl, context = '' } = req.body;
    
    if (!originalUrl) {
      return res.status(400).json({ error: 'originalUrl is required' });
    }

    const geminiService = req.app.locals.geminiService;
    const suggestions = await geminiService.generateUrlSuggestions({ originalUrl, context });
    
    if (suggestions.error) {
      return res.status(500).json({ error: suggestions.error });
    }

    res.json(suggestions);
  } catch (error) {
    logger.error('Error generating URL suggestions:', error);
    res.status(500).json({ error: 'Failed to generate URL suggestions' });
  }
});

/**
 * @swagger
 * /api/ai/detect/anomalies:
 *   get:
 *     summary: Detect anomalies in system behavior
 *     tags: [AI Detection]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 30d]
 *           default: 7d
 *       - in: query
 *         name: sensitivity
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *           default: medium
 *     responses:
 *       200:
 *         description: AI-detected anomalies and concerns
 */
router.get('/detect/anomalies', async (req, res) => {
  try {
    const { timeRange = '7d', sensitivity = 'medium' } = req.query;
    
    const geminiService = req.app.locals.geminiService;
    const anomalies = await geminiService.detectAnomalies({ timeRange, sensitivity });
    
    if (anomalies.error) {
      return res.status(500).json({ error: anomalies.error });
    }

    res.json(anomalies);
  } catch (error) {
    logger.error('Error detecting anomalies:', error);
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});

/**
 * @swagger
 * /api/ai/execute:
 *   post:
 *     summary: Execute a specific AI tool
 *     tags: [AI Tools]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toolName
 *               - parameters
 *             properties:
 *               toolName:
 *                 type: string
 *                 description: Name of the tool to execute
 *               parameters:
 *                 type: object
 *                 description: Parameters for the tool
 *     responses:
 *       200:
 *         description: Tool execution result
 */
router.post('/execute', async (req, res) => {
  try {
    const { toolName, parameters } = req.body;
    
    if (!toolName || !parameters) {
      return res.status(400).json({ error: 'toolName and parameters are required' });
    }

    const geminiService = req.app.locals.geminiService;
    const result = await geminiService.executeTool(toolName, parameters);
    
    res.json({
      toolName,
      parameters,
      result,
      executedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error executing AI tool:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to execute AI tool' });
  }
});

module.exports = router;