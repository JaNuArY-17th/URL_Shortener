require('dotenv').config();

// Check if we need to read the existing file first
const config = {
  server: {
    port: process.env.PORT || 3004,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  db: {
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/notifications?retryWrites=true&w=majority&appName=Cluster1'
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  rabbitmq: {
    uri: process.env.RABBITMQ_URI || 'amqp://localhost:5672',
    exchanges: {
      urlEvents: 'url-shortener-events',
      userEvents: 'user-events'
    },
    queues: {
      urlNotifications: 'notification-service.url-events',
      userNotifications: 'notification-service.user-events'
    },
    routingKeys: {
      urlCreated: 'url.created',
      urlRedirect: 'url.redirect',
      userCreated: 'user.created',
      passwordResetRequested: 'password.reset.requested',
      passwordResetCompleted: 'password.reset.completed'
    }
  },
  cors: {
    origins: process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',') : 
      ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:5000', 'https://url-shortener-obve.onrender.com']
  },
  socketIO: {
    enabled: process.env.SOCKET_IO_ENABLED !== 'false',
    path: process.env.SOCKET_IO_PATH || '/api/notifications/socket.io',
    cors: {
      origin: process.env.SOCKET_IO_CORS_ORIGIN ? 
        process.env.SOCKET_IO_CORS_ORIGIN.split(',') :
        ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:5000', 'https://url-shortener-obve.onrender.com'],
      methods: ["GET", "POST"],
      allowedHeaders: ["content-type", "authorization"],
      credentials: true
    }
  },
  notifications: {
    retention: {
      days: parseInt(process.env.NOTIFICATION_RETENTION_DAYS) || 30
    },
    defaultPreferences: {
      email: process.env.DEFAULT_EMAIL_NOTIFICATIONS !== 'false',
      push: process.env.DEFAULT_PUSH_NOTIFICATIONS === 'true',
      inApp: true
    }
  },
  rateLimit: {
    api: {
      windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.API_RATE_LIMIT_MAX) || 100 // 100 requests per window
    }
  },
  email: {
    enabled: process.env.EMAIL_ENABLED !== 'false', // Enable by default
    service: process.env.EMAIL_SERVICE || 'gmail',
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER || 'nhl170100@gmail.com',
      pass: process.env.EMAIL_PASS // You'll need to set this with app password
    },
    from: process.env.EMAIL_FROM || 'nhl170100@gmail.com'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: process.env.LOG_DIRECTORY || './logs'
  }
};

module.exports = config; 