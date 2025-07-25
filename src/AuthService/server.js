require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/config');
const logger = require('./services/logger');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');
const { swaggerDocs } = require('./swagger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

// Create Express app
const app = express();

// Connect to MongoDB
mongoose.connect(config.db.mongodb.uri)
  .then(() => logger.info('MongoDB connected'))
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging
app.use(morgan('combined', { stream: logger.stream }));

// Passport middleware
app.use(passport.initialize());

// Passport config
require('./config/passport')(passport);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'auth-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

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