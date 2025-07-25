require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  db: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/notification?retryWrites=true&w=majority&appName=Cluster1'
    }
  },
  rabbitmq: {
    uri: process.env.RABBITMQ_URI || 'amqp://localhost:5672',
    exchanges: {
      events: process.env.RABBITMQ_EXCHANGE || 'url-shortener-events'
    },
    queues: {
      userCreated: process.env.RABBITMQ_QUEUE_USER_CREATED || 'notification-service-user-created',
      urlCreated: process.env.RABBITMQ_QUEUE_URL_CREATED || 'notification-service-url-created'
    }
  },
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || false,
      auth: {
        user: process.env.SMTP_USER || 'user@example.com',
        pass: process.env.SMTP_PASS || 'password'
      }
    },
    from: process.env.EMAIL_FROM || 'URL Shortener <noreply@urlshortener.com>'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config; 