const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database connections (privacy-aware)
  databases: {
    analytics: process.env.MONGODB_ANALYTICS_URI || 
      'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/analytics?retryWrites=true&w=majority&appName=Cluster1',
    redirect: process.env.MONGODB_REDIRECT_URI || 
      'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/redirect?retryWrites=true&w=majority&appName=Cluster1',
    notification: process.env.MONGODB_NOTIFICATION_URI || 
      'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/notification?retryWrites=true&w=majority&appName=Cluster1',
    auth: process.env.MONGODB_AUTH_URI || 
      'mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/auth?retryWrites=true&w=majority&appName=Cluster1'
  },

  // AI Configuration
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-pro',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 2048,
    temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
    enableCaching: process.env.AI_ENABLE_CACHING !== 'false',
    cacheTimeout: parseInt(process.env.AI_CACHE_TIMEOUT) || 300 // 5 minutes
  },

  // Privacy settings
  privacy: {
    enableUserDataAccess: process.env.PRIVACY_ENABLE_USER_DATA === 'true',
    hashUserIds: process.env.PRIVACY_HASH_USER_IDS !== 'false',
    dataRetentionDays: parseInt(process.env.PRIVACY_DATA_RETENTION_DAYS) || 365,
    anonymizeAfterDays: parseInt(process.env.PRIVACY_ANONYMIZE_AFTER_DAYS) || 90
  },

  // CORS configuration
  cors: {
    origins: process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',') : 
      ['http://localhost:8080', 'http://localhost:3000', 'http://localhost:5000']
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // Rate limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    aiWindowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute
    aiMaxRequests: parseInt(process.env.AI_RATE_LIMIT_MAX_REQUESTS) || 10
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
    enableFile: process.env.LOG_ENABLE_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH || './logs/ai-assistant.log'
  },

  // Cache configuration
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 100 // Max 100 cached items
  },

  // Analytics configuration
  analytics: {
    enableDetailedAnalytics: process.env.DETAILED_ANALYTICS === 'true',
    defaultTimeRange: process.env.DEFAULT_TIME_RANGE || '7d',
    maxDataPoints: parseInt(process.env.MAX_DATA_POINTS) || 10000
  },

  // Service URLs (for API calls if needed)
  services: {
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
    urlShortenerService: process.env.URL_SHORTENER_SERVICE_URL || 'http://localhost:5002',
    redirectService: process.env.REDIRECT_SERVICE_URL || 'http://localhost:5003',
    analyticsService: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:5004',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5005',
    apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:5000'
  }
};

module.exports = config;