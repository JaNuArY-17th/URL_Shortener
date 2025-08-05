const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const config = require('./config/config');
const logger = require('./services/logger');
const GeminiMCPService = require('./services/geminiMCPService');
const PrivacyAwareDataService = require('./services/privacyAwareDataService');

// Import routes
const healthRoutes = require('./routes/health');
const aiRoutes = require('./routes/ai');
const analyticsRoutes = require('./routes/analytics');
const chatRoutes = require('./routes/chat');

// Import middleware
const authenticate = require('./middleware/authenticate');
const errorHandler = require('./middleware/error-handler');
const requestId = require('./middleware/request-id');

const app = express();

// Initialize services
const geminiService = new GeminiMCPService();
const dataService = new PrivacyAwareDataService();

// Make services available to routes
app.locals.geminiService = geminiService;
app.locals.dataService = dataService;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// AI-specific rate limiting (more restrictive)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit AI requests to 10 per minute
  message: {
    error: 'AI request limit exceeded. Please wait before making more AI requests.',
    retryAfter: '1 minute'
  }
});

app.use('/api/ai/', aiLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use(requestId);

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    requestId: req.requestId,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/ai', authenticate, aiRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/chat', authenticate, chatRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'AI Assistant Service',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      ai: '/api/ai',
      analytics: '/api/analytics',
      chat: '/api/chat'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await dataService.closeConnections();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    await dataService.closeConnections();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
  
  process.exit(0);
});

// Start server
const PORT = config.port || 3000;
app.listen(PORT, () => {
  logger.info(`AI Assistant Service running on port ${PORT}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`CORS origins: ${config.cors.origins.join(', ')}`);
});

module.exports = app;