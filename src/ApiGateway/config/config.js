require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret',
    issuer: process.env.JWT_ISSUER || 'auth-service',
    audience: process.env.JWT_AUDIENCE || 'url-shortener-api',
    expiry: process.env.JWT_EXPIRY || '60m'
  },
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'https://authservice-kkwn.onrender.com',
    urlShorteners: process.env.URL_SHORTENER_SERVICE_URL || 'https://urlshortenerservice-407v.onrender.com',
    redirect: process.env.REDIRECT_SERVICE_URL || 'https://redirectservice-ayfr.onrender.com',
    analytics: process.env.ANALYTICS_SERVICE_URL || 'https://analyticsservice.onrender.com',
    notification: process.env.NOTIFICATION_SERVICE_URL || 'https://notificationservice-83qo.onrender.com'
  },
  swagger: {
    apis: {
      auth: {
        name: 'Auth Service API',
        version: 'v1',
        url: `${process.env.AUTH_SERVICE_URL || 'https://authservice-kkwn.onrender.com'}/api-docs`
      },
      urlShorteners: {
        name: 'URL Shortener Service API',
        version: 'v1',
        url: `${process.env.URL_SHORTENER_SERVICE_URL || 'https://urlshortenerservice-407v.onrender.com'}/api-docs/index.html`
      },
      redirect: {
        name: 'Redirect Service API',
        version: 'v1',
        url: `${process.env.REDIRECT_SERVICE_URL || 'https://redirectservice-ayfr.onrender.com'}/api-docs`
      },
      analytics: {
        name: 'Analytics Service API',
        version: 'v1',
        url: `${process.env.ANALYTICS_SERVICE_URL || 'https://analyticsservice.onrender.com'}/api-docs`
      },
      notification: {
        name: 'Notification Service API',
        version: 'v1',
        url: `${process.env.NOTIFICATION_SERVICE_URL || 'https://notificationservice-83qo.onrender.com'}/api-docs`
      }
    }
  },
  cors: {
    origins: process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',') : 
      ['http://localhost:3000', 'http://localhost:8080', 'https://url-shortener-app.onrender.com']
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 100 requests per minute
    message: {
      status: 'error',
      message: 'Quá nhiều yêu cầu, vui lòng thử lại sau'
    }
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs/api-gateway.log'
  }
};

module.exports = config; 