require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/config');
const logger = require('./services/logger');
const addRequestId = require('./middleware/request-id');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const { swaggerDocs } = require('./swagger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const healthRoutes = require('./routes/health');

// Create Express app
const app = express();
app.set('trust proxy', 'loopback, linklocal, uniquelocal');

// Connect to MongoDB
mongoose.connect(config.db.mongodb.uri)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Detailed CORS configuration
const corsOptions = {
  origin: config.cors.origins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-Total-Count'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(helmet());
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

// Passport middleware
app.use(passport.initialize());

// Passport config
require('./config/passport')(passport);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/health', healthRoutes);

// Setup Swagger
swaggerDocs(app);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Create directory for logs
const fs = require('fs');
const path = require('path');
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  logger.info(`Auth Service running on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
}); 