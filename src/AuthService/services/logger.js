const winston = require('winston');
const config = require('../config/config');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'auth-service' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(
          info => `${info.timestamp} ${info.level}: ${info.message}`
        )
      )
    }),
    // File transport for all logs
    new winston.transports.File({ filename: 'logs/auth-service.log' }),
    // File transport for error logs
    new winston.transports.File({ 
      filename: 'logs/auth-service-error.log',
      level: 'error'
    })
  ]
});

// If not in production, also log to console with simple format
if (config.server.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Stream for morgan (HTTP request logger middleware)
logger.stream = {
  write: function(message) {
    logger.info(message.trim());
  }
};

module.exports = logger; 