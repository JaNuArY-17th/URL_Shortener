const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const config = require('./config/config');
const logger = require('./services/logger');
const addRequestId = require('./middleware/request-id');
const { notFoundHandler, errorHandler } = require('./middleware/error-handler');

// Import routes
const swaggerRoutes = require('./routes/swagger');
const healthRoutes = require('./routes/health');
const setupProxyRoutes = require('./routes/proxy');

// Khởi tạo express app
const app = express();
app.set('trust proxy', true);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: config.rateLimit.message
});

// Apply middlewares
app.use(addRequestId);

// Cấu hình Helmet với các thiết lập đặc biệt cho Swagger UI
app.use((req, res, next) => {
  // Kiểm tra nếu đường dẫn yêu cầu liên quan đến Swagger UI hoặc API docs
  if (req.path.includes('/api-docs') || 
      req.path.includes('/swagger') || 
      req.path.includes('/docs')) {
    // Sử dụng cấu hình helmet thông thoáng hơn cho Swagger UI
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false
    })(req, res, next);
  } else {
    // Sử dụng cấu hình helmet mặc định cho các đường dẫn khác
    helmet()(req, res, next);
  }
});

app.use(cors({
  origin: config.cors.origins,
  credentials: true
}));
app.use(morgan('combined', {
  stream: {
    write: (message) => {
      logger.info(message.trim());
    }
  }
}));
app.use(limiter);
app.use(express.json());

// Apply routes
app.use('/api/health', healthRoutes);
app.use('/swagger', swaggerRoutes);

// Setup proxy routes
setupProxyRoutes(app);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const port = config.server.port;
const server = app.listen(port, () => {
  logger.info(`API Gateway đang chạy tại http://localhost:${port}`);
});

// Xử lý shutdown gracefully
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

module.exports = server; 