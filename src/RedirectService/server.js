require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const redirectRoutes = require('./routes/redirect');
const healthRoutes = require('./routes/health');
const { initRedisClient } = require('./services/cacheService');
const { connectRabbitMQ } = require('./services/messageHandler');
const config = require('./config/config');

// Create Express app
const app = express();

// Connect to MongoDB
mongoose.connect(config.db.mongodb.uri)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Initialize Redis client
initRedisClient()
  .then(() => console.log('Redis client initialized'))
  .catch(err => console.error('Redis initialization error:', err));

// Connect to RabbitMQ and set up consumers
connectRabbitMQ()
  .then(() => console.log('RabbitMQ consumers setup complete'))
  .catch(err => console.error('RabbitMQ setup error:', err));

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/', redirectRoutes); // Main redirect route

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Internal Server Error',
    error: config.server.nodeEnv === 'development' ? err.message : {}
  });
});

// Start server
const PORT = config.server.port;
app.listen(PORT, () => console.log(`Redirect Service running on port ${PORT}`)); 