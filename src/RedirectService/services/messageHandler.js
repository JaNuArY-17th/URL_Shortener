const amqp = require('amqplib');
const config = require('../config/config');
const logger = require('./logger');
const cacheService = require('./cacheService');
const Url = require('../models/Url');

let connection = null;
let channel = null;
let connected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Connect to RabbitMQ and setup channels
 * @returns {Promise<void>}
 */
const connect = async () => {
  try {
    // Create connection
    connection = await amqp.connect(config.rabbitmq.uri);
    channel = await connection.createChannel();
    connected = true;
    reconnectAttempts = 0;
    
    logger.info('Connected to RabbitMQ');
    
    // Handle connection closure
    connection.on('close', (err) => {
      connected = false;
      logger.warn('RabbitMQ connection closed', err ? { error: err.message } : {});
      
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(1000 * reconnectAttempts, 30000); // Max 30 seconds
        logger.info(`Attempting to reconnect to RabbitMQ in ${delay}ms (attempt ${reconnectAttempts})`);
        
        setTimeout(() => {
          connect().catch(err => {
            logger.error('Failed to reconnect to RabbitMQ:', err);
          });
        }, delay);
      } else {
        logger.error('Max reconnect attempts reached, giving up');
      }
    });
    
    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', err);
      connected = false;
    });
    
    // Setup exchanges and queues
    await setupExchangesAndQueues();
    
    // Start consuming messages
    await startConsuming();
  } catch (error) {
    logger.error('Error connecting to RabbitMQ:', error);
    connected = false;
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = Math.min(1000 * reconnectAttempts, 30000); // Max 30 seconds
      logger.info(`Attempting to reconnect to RabbitMQ in ${delay}ms (attempt ${reconnectAttempts})`);
      
      setTimeout(() => {
        connect().catch(err => {
          logger.error('Failed to reconnect to RabbitMQ:', err);
        });
      }, delay);
    } else {
      logger.error('Max reconnect attempts reached, giving up');
    }
  }
};

/**
 * Setup exchanges and queues
 * @returns {Promise<void>}
 */
const setupExchangesAndQueues = async () => {
  if (!channel || !connected) {
    throw new Error('Not connected to RabbitMQ');
  }
  
  // Setup exchange
  await channel.assertExchange(config.rabbitmq.exchanges.events, 'topic', {
    durable: true
  });
  
  // Setup queues
  // For URL created events
  const urlCreatedQueue = await channel.assertQueue(config.rabbitmq.queues.urlCreated, {
    durable: true
  });
  
  // For redirect occurred events
  const redirectEventsQueue = await channel.assertQueue(config.rabbitmq.queues.redirectEvents, {
    durable: true
  });
  
  // Bind queues to exchange
  await channel.bindQueue(
    urlCreatedQueue.queue,
    config.rabbitmq.exchanges.events,
    'url.created'
  );
  
  logger.info('RabbitMQ exchanges and queues setup completed');
};

/**
 * Start consuming messages
 * @returns {Promise<void>}
 */
const startConsuming = async () => {
  if (!channel || !connected) {
    throw new Error('Not connected to RabbitMQ');
  }
  
  // Consume URL created events to warm up cache
  await channel.consume(
    config.rabbitmq.queues.urlCreated,
    async (msg) => {
      try {
        if (msg) {
          const raw = JSON.parse(msg.content.toString());
          // Chuyển đổi field PascalCase (từ .NET) sang camelCase cho Node
          const content = {
            shortCode: raw.shortCode || raw.ShortCode,
            originalUrl: raw.originalUrl || raw.OriginalUrl,
            userId: raw.userId || raw.UserId || null,
            expiresAt: raw.expiresAt || raw.ExpiresAt || null,
            metadata: raw.metadata || raw.Metadata || {}
          };
          logger.info('Received URL created event:', { 
            shortCode: content.shortCode,
            routingKey: msg.fields.routingKey
          });
          
          if (!content.shortCode || !content.originalUrl) {
            logger.error('Invalid UrlCreatedEvent payload – missing shortCode/originalUrl', { rawEvent: raw });
            channel.nack(msg, false, false);
            return;
          }
          
          // Lưu URL vào database
          try {
            // Kiểm tra xem URL đã tồn tại chưa
            const existingUrl = await Url.findOne({ shortCode: content.shortCode });
            
            if (!existingUrl) {
              // Tạo URL mới trong database
              const newUrl = new Url({
                shortCode: content.shortCode,
                originalUrl: content.originalUrl,
                userId: content.userId || null,
                expiresAt: content.expiresAt ? new Date(content.expiresAt) : null,
                metadata: content.metadata || {}
              });
              
              await newUrl.save();
              logger.info('URL đã được lưu vào database', { shortCode: content.shortCode });
            } else {
              logger.warn('URL đã tồn tại trong database', { shortCode: content.shortCode });
            }
            
            // Cache the URL
            if (content.shortCode && content.originalUrl) {
              await cacheService.cacheUrl(content.shortCode, content.originalUrl);
              logger.info('URL cached successfully', { shortCode: content.shortCode });
            }
          } catch (dbError) {
            logger.error('Lỗi khi lưu URL vào database:', {
              error: dbError.message,
              shortCode: content.shortCode
            });
            // Nếu lỗi khi lưu vào database nhưng vẫn cần acknowledge message
            // để tránh việc message bị requeue vô hạn
          }
          
          // Acknowledge message
          channel.ack(msg);
        }
      } catch (error) {
        logger.error('Error processing URL created event:', error);
        // Negative acknowledge and requeue the message
        channel.nack(msg, false, false);
      }
    },
    {
      noAck: false
    }
  );
  
  logger.info('Started consuming messages from RabbitMQ');
};

/**
 * Publish redirect event
 * @param {Object} eventData Event data
 * @returns {Promise<boolean>} Success status
 */
const publishRedirectEvent = async (eventData) => {
  if (!channel || !connected) {
    logger.warn('Cannot publish redirect event: not connected to RabbitMQ');
    return false;
  }
  
  try {
    const eventMessage = {
      ...eventData,
      source: 'redirect-service',
      timestamp: new Date().toISOString()
    };
    
    await channel.publish(
      config.rabbitmq.exchanges.events,
      'url.redirect',
      Buffer.from(JSON.stringify(eventMessage)),
      {
        persistent: true,
        contentType: 'application/json'
      }
    );
    
    logger.info('Published redirect event', {
      shortCode: eventData.shortCode,
      routingKey: 'url.redirect'
    });
    
    return true;
  } catch (error) {
    logger.error('Error publishing redirect event:', error);
    return false;
  }
};

/**
 * Close RabbitMQ connection
 * @returns {Promise<void>}
 */
const close = async () => {
  if (channel) {
    await channel.close();
  }
  
  if (connection) {
    await connection.close();
  }
  
  connected = false;
  logger.info('RabbitMQ connection closed');
};

/**
 * Check if connected to RabbitMQ
 * @returns {boolean} Connection status
 */
const isConnected = () => {
  return connected;
};

module.exports = {
  connect,
  publishRedirectEvent,
  close,
  isConnected
}; 