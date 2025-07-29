require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/config');
const logger = require('./services/logger');
const messageHandler = require('./services/messageHandler');
const cacheService = require('./services/cacheService');
const geoService = require('./services/geoService');
const addRequestId = require('./middleware/request-id');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const { setupCSP, setupSecurityHeaders, smartRateLimit, botDetection } = require('./middleware/security');
const { swaggerDocs } = require('./swagger');

// Import routes
const redirectRoutes = require('./routes/redirect');
const healthRoutes = require('./routes/health');
const urlManagementRoutes = require('./routes/url-management');
// Loại bỏ import analyticsRoutes

// Create Express app
const app = express();

// Connect to MongoDB
mongoose.connect(config.db.mongodb.uri)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Connect to RabbitMQ
messageHandler.connect()
  .then(() => {
    logger.info('Connected to RabbitMQ');
  })
  .catch(err => {
    logger.error('Failed to connect to RabbitMQ:', err);
    // Continue execution anyway, will retry connection
  });

// Pre-warm cache with popular URLs (after DB connection)
mongoose.connection.once('connected', async () => {
  try {
    const Url = require('./models/Url');
    // Get top 50 most clicked URLs
    const popularUrls = await Url.find({ active: true })
      .sort({ clicks: -1 })
      .limit(50)
      .select('shortCode originalUrl clicks');
    
    const urlsToCache = popularUrls.map(url => ({
      shortCode: url.shortCode,
      originalUrl: url.originalUrl,
      popularity: url.clicks || 0
    }));
    
    if (urlsToCache.length > 0) {
      await cacheService.preWarmCache(urlsToCache);
    }
    
    // Initialize geo rules if needed
    if (config.features && config.features.geoTargeting) {
      // You could load these rules from a database or config file
      const geoRules = {
        // Example rule: { shortCode: { US: 'https://us-site.com', GB: 'https://uk-site.com', default: 'https://global-site.com' } }
      };
      geoService.initRedirectRules(geoRules);
    }
  } catch (error) {
    logger.error('Error pre-warming cache:', error);
  }
});

// Metrics tracking
const metrics = {
  requestCount: 0,
  redirectCount: 0,
  errors: 0,
  startTime: Date.now(),
  
  incrementRequest() {
    this.requestCount++;
  },
  
  incrementRedirect() {
    this.redirectCount++;
  },
  
  incrementError() {
    this.errors++;
  },
  
  getMetrics() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      requests: this.requestCount,
      redirects: this.redirectCount,
      errors: this.errors,
      uptime,
      requestsPerMinute: uptime > 0 ? (this.requestCount / (uptime / 60)).toFixed(2) : 0,
      redirectsPerMinute: uptime > 0 ? (this.redirectCount / (uptime / 60)).toFixed(2) : 0,
      errorRate: this.requestCount > 0 ? ((this.errors / this.requestCount) * 100).toFixed(2) + '%' : '0%'
    };
  },
  
  reset() {
    this.requestCount = 0;
    this.redirectCount = 0;
    this.errors = 0;
    this.startTime = Date.now();
  }
};

// Detailed CORS configuration
const corsOptions = {
  origin: config.cors.origins,
  methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-Requested-With', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-Total-Count'],
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(helmet());
app.use(setupCSP());
app.use(setupSecurityHeaders());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(addRequestId);

// Bot detection and smart rate limiting
app.use(botDetection());
app.use(...smartRateLimit());

// Request logging with request ID
app.use(morgan((tokens, req, res) => {
  return [
    `[${req.id}]`,
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens.res(req, res, 'content-length'), '-',
    tokens['response-time'](req, res), 'ms'
  ].join(' ');
}, { stream: logger.stream }));

// Metrics middleware
app.use((req, res, next) => {
  metrics.incrementRequest();
  
  // Track redirect operations
  const originalEnd = res.end;
  res.end = function() {
    if (req.path.match(/^\/[a-zA-Z0-9_-]+$/) && res.statusCode >= 300 && res.statusCode < 400) {
      metrics.incrementRedirect();
    }
    
    if (res.statusCode >= 400) {
      metrics.incrementError();
    }
    
    originalEnd.apply(res, arguments);
  };
  
  next();
});

// Setup Swagger (PHẢI ĐƯỢC ĐẶT TRƯỚC router CHÍNH)
swaggerDocs(app);

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/urls', urlManagementRoutes);
// Loại bỏ /api/analytics route

// Add metrics endpoint
app.get('/api/metrics', (req, res) => {
  res.json({
    service: 'redirect-service',
    timestamp: new Date().toISOString(),
    metrics: metrics.getMetrics(),
    cache: cacheService.stats
  });
});

// Main redirect route for short URLs - PHẢI ĐẶT CUỐI CÙNG để xử lý các path còn lại
app.use('/', redirectRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Create directory for logs
const fs = require('fs');
const path = require('path');
const logsDir = path.join(__dirname, config.logging.directory);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Handle graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
  logger.info('Received shutdown signal, starting graceful shutdown');
  
  // Close server first to stop accepting new requests
  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
    logger.info('HTTP server closed');
  }
  
  // Close message broker connection
  try {
    await messageHandler.close();
  } catch (err) {
    logger.error('Error closing message broker connection:', err);
  }
  
  // Close database connection
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (err) {
    logger.error('Error closing MongoDB connection:', err);
  }
  
  logger.info('Graceful shutdown completed');
  process.exit(0);
}

// Start server
const PORT = config.server.port;
const server = app.listen(PORT, () => {
  logger.info(`Redirect Service running on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
}); 