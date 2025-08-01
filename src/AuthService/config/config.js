require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  db: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/auth?retryWrites=true&w=majority&appName=Cluster1'
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  rabbitmq: {
    uri: process.env.RABBITMQ_URI || 'amqp://localhost:5672',
    exchanges: {
      userEvents: process.env.RABBITMQ_USER_EVENTS_EXCHANGE || 'user-events'
    },
    routingKeys: {
      userCreated: 'user.created',
      passwordResetRequested: 'password.reset.requested',
      passwordResetCompleted: 'password.reset.completed',
      emailVerificationRequested: 'email.verification.requested'
    }
  },
  cors: {
    origins: process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',') : 
      ['http://localhost:8080', 'http://localhost:3000']
  },
  rateLimit: {
    login: {
      max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5,
      windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000 // 15 minutes
    },
    register: {
      max: parseInt(process.env.REGISTER_RATE_LIMIT_MAX) || 3,
      windowMs: parseInt(process.env.REGISTER_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000 // 1 hour
    }
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config; 