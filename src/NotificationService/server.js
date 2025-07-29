require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/config');
const logger = require('./services/logger');
const messageHandler = require('./services/messageHandler');
const socketService = require('./services/socketService');
const addRequestId = require('./middleware/request-id');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const { swaggerDocs } = require('./swagger');

// Import routes
const notificationsRoutes = require('./routes/notifications');
const healthRoutes = require('./routes/health');

// Create Express app
const app = express();

// Trust proxy for deployments behind reverse proxies (like on Render)
app.set('trust proxy', true);

// Create HTTP server
const server = http.createServer(app);

// Connect to MongoDB
mongoose.connect(config.db.mongodb.uri)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Connect to RabbitMQ
messageHandler.connect()
  .catch(err => {
    logger.error('Failed to connect to RabbitMQ:', err);
    // Continue execution anyway, will retry connection
  });

// Initialize Socket.IO if enabled
socketService.initialize(server);

// Detailed CORS configuration
const corsOptions = {
  origin: config.cors.origins,
  methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'X-Requested-With', 'X-Request-ID', 'Authorization'],
  exposedHeaders: ['X-Request-ID', 'X-Total-Count'],
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(addRequestId);

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

// Setup Swagger
swaggerDocs(app);

// API Routes
app.use('/api/notifications', notificationsRoutes);
app.use('/api/health', healthRoutes);

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
  
  // Close socket.io connections
  socketService.close();
  
  // Close message broker connection
  try {
    await messageHandler.close();
    logger.info('RabbitMQ connection closed');
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
server.listen(PORT, () => {
  logger.info(`Notification Service running on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
}); 