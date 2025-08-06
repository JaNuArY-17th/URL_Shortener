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
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  redis: {
    uri: process.env.REDIS_URI || 'redis://localhost:6379',
    cacheExpiry: parseInt(process.env.REDIS_CACHE_EXPIRY) || 3600, // 1 hour in seconds
    reconnectStrategy: (retries) => Math.min(retries * 50, 2000) // reconnect strategy with backoff
  },
  rabbitmq: {
    uri: process.env.RABBITMQ_URI || 'amqp://localhost:5672',
    exchanges: {
      events: process.env.RABBITMQ_EXCHANGE || 'url-shortener-events'
    },
    queues: {
      urlCreated: process.env.RABBITMQ_QUEUE_URL_CREATED || 'redirect-service.url-created',
      redirectEvents: process.env.RABBITMQ_QUEUE_REDIRECT_EVENTS || 'redirect-events'
    }
  },
  cors: {
    origins: process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',') : 
      ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:5000']
  },
  rateLimit: {
    redirect: {
      windowMs: parseInt(process.env.REDIRECT_RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute
      max: parseInt(process.env.REDIRECT_RATE_LIMIT_MAX) || 60, // 60 redirects per minute
      message: {
        status: 'error',
        message: 'Too many redirects from this IP, please try again after a minute'
      }
    },
    api: {
      windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.API_RATE_LIMIT_MAX) || 100, // 100 requests per 15 minutes
      message: {
        status: 'error',
        message: 'Too many API requests from this IP, please try again after 15 minutes'
      }
    }
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: process.env.LOG_DIRECTORY || './logs'
  },
  metrics: {
    clickCooldown: parseInt(process.env.CLICK_COOLDOWN) || 2000 // Minimum time between click counts for same IP
  },
  security: {
    trustProxy: process.env.TRUST_PROXY === 'true' || false,
    adminIPs: process.env.ADMIN_IPS ? process.env.ADMIN_IPS.split(',') : [],
    botProtection: process.env.BOT_PROTECTION === 'true' || true,
    apiKeys: process.env.API_KEYS ? process.env.API_KEYS.split(',') : []
  },
  features: {
    geoTargeting: process.env.FEATURE_GEO_TARGETING === 'true' || true,
    analytics: process.env.FEATURE_ANALYTICS === 'true' || true,
    advancedMetrics: process.env.FEATURE_ADVANCED_METRICS === 'true' || true,
    customSlugs: process.env.FEATURE_CUSTOM_SLUGS === 'true' || true
  },
  geoip: {
    provider: process.env.GEOIP_PROVIDER || 'mock', // 'mock', 'maxmind', etc.
    maxmindDbPath: process.env.MAXMIND_DB_PATH || './geoip/GeoLite2-Country.mmdb',
    apiKey: process.env.GEOIP_API_KEY || ''
  }
};

module.exports = config; 