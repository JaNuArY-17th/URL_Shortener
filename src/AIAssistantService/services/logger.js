const winston = require('winston');
const config = require('../config/config');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'ai-assistant-service' },
  transports: []
});

// Add console transport if enabled
if (config.logging.enableConsole) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Add file transport if enabled
if (config.logging.enableFile) {
  logger.add(new winston.transports.File({
    filename: config.logging.filePath,
    format: logFormat
  }));
}

module.exports = logger;