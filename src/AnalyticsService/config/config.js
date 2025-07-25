require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3002,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  db: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/analytics?retryWrites=true&w=majority&appName=Cluster1'
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  rabbitmq: {
    uri: process.env.RABBITMQ_URI || 'amqp://localhost:5672',
    exchanges: {
      urlEvents: 'url-events'
    },
    queues: {
      redirectEvents: 'analytics-redirect-events'
    },
    routingKeys: {
      urlCreated: 'url.created',
      urlRedirect: 'url.redirect'
    }
  },
  cors: {
    origins: process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',') : 
      ['http://localhost:8080', 'http://localhost:3000']
  },
  rateLimit: {
    api: {
      max: parseInt(process.env.API_RATE_LIMIT_MAX) || 100,
      windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000 // 15 minutes
    }
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: process.env.LOG_DIRECTORY || 'logs'
  },
  features: {
    enableCaching: process.env.ENABLE_CACHING !== 'false',
    detailedAnalytics: process.env.DETAILED_ANALYTICS === 'true',
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS) || 365
  },
  api: {
    maxResultsPerPage: parseInt(process.env.MAX_RESULTS_PER_PAGE) || 100
  }
};

module.exports = config; 