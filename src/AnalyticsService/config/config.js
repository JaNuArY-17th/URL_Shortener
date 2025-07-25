require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  db: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/analytics?retryWrites=true&w=majority&appName=Cluster1'
    }
  },
  rabbitmq: {
    uri: process.env.RABBITMQ_URI || 'amqp://localhost:5672',
    exchanges: {
      events: process.env.RABBITMQ_EXCHANGE || 'url-shortener-events'
    },
    queues: {
      redirectEvents: process.env.RABBITMQ_QUEUE_REDIRECT_EVENTS || 'analytics-service-redirect-events'
    }
  },
  api: {
    defaultLimit: parseInt(process.env.DEFAULT_LIMIT) || 20,
    maxLimit: parseInt(process.env.MAX_LIMIT) || 100
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config; 