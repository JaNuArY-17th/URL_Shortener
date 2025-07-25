require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  db: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/redirect?retryWrites=true&w=majority&appName=Cluster1'
    }
  },
  redis: {
    uri: process.env.REDIS_URI || 'redis://localhost:6379',
    cacheExpiry: parseInt(process.env.CACHE_EXPIRY_SECONDS) || 86400 // 24 hours in seconds
  },
  rabbitmq: {
    uri: process.env.RABBITMQ_URI || 'amqp://localhost:5672',
    exchanges: {
      events: process.env.RABBITMQ_EXCHANGE || 'url-shortener-events'
    },
    queues: {
      urlCreated: process.env.RABBITMQ_QUEUE_URL_CREATED || 'redirect-service-url-created'
    }
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config; 