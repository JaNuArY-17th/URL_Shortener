const express = require('express');
const router = express.Router();
const logger = require('../services/logger');

/**
 * @swagger
 * /api/chat/query:
 *   post:
 *     summary: Process natural language query with AI
 *     tags: [AI Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Natural language query
 *               timeRange:
 *                 type: string
 *                 enum: [1d, 7d, 30d, 90d]
 *                 default: 7d
 *               includeData:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: AI response to the query
 */
router.post('/query', async (req, res) => {
  try {
    const { query, timeRange = '7d', includeData = true } = req.body;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required and must be a non-empty string' });
    }

    const context = {
      userId: req.user?.id,
      timeRange,
      includeData
    };

    const geminiService = req.app.locals.geminiService;
    const response = await geminiService.processQuery(query.trim(), context);
    
    if (response.error) {
      return res.status(500).json({ error: response.error });
    }

    res.json(response);
  } catch (error) {
    logger.error('Error processing chat query:', error);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

module.exports = router;