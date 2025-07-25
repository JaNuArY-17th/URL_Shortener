require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 3003,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  db: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/notification?retryWrites=true&w=majority&appName=Cluster1'
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  rabbitmq: {
    uri: process.env.RABBITMQ_URI || 'amqp://localhost:5672',
    exchanges: {
      urlEvents: 'url-events',
      userEvents: 'user-events'
    },
    queues: {
      urlNotifications: 'url-notifications',
      userNotifications: 'user-notifications'
    },
    routingKeys: {
      urlCreated: 'url.created',
      urlRedirect: 'url.redirect',
      userCreated: 'user.created'
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
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    from: process.env.EMAIL_FROM || 'noreply@urlshortener.example.com',
    service: process.env.EMAIL_SERVICE || 'smtp',
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || ''
    }
  },
  socketIO: {
    enabled: process.env.SOCKET_IO_ENABLED === 'true',
    cors: {
      origin: process.env.SOCKET_IO_ORIGIN ? 
        process.env.SOCKET_IO_ORIGIN.split(',') : 
        ['http://localhost:8080', 'http://localhost:3000'],
      methods: ["GET", "POST"],
      credentials: true
    }
  },
  notifications: {
    retention: {
      days: parseInt(process.env.NOTIFICATION_RETENTION_DAYS) || 30
    },
    defaultPreferences: {
      email: process.env.DEFAULT_EMAIL_NOTIFICATIONS === 'true',
      push: process.env.DEFAULT_PUSH_NOTIFICATIONS === 'true',
      inApp: true
    },
    batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE) || 50
  }
};

module.exports = config; 