const amqp = require('amqplib');
const config = require('../config/config');
const logger = require('./logger');

// RabbitMQ connection
let channel = null;

// Connect to RabbitMQ
const connectRabbitMQ = async () => {
  if (channel) return channel;

  try {
    const connection = await amqp.connect(config.rabbitmq.uri);
    channel = await connection.createChannel();
    
    // Exchange for event publishing
    await channel.assertExchange('url-shortener-events', 'topic', {
      durable: true
    });
    
    logger.info('Connected to RabbitMQ');
    return channel;
  } catch (error) {
    logger.error('Error connecting to RabbitMQ:', error.message);
    return null;
  }
};

// Publish event to RabbitMQ
const publishEvent = async (eventName, data) => {
  try {
    if (!channel) {
      channel = await connectRabbitMQ();
    }
    
    if (!channel) {
      throw new Error('RabbitMQ channel not available');
    }

    const event = {
      eventName,
      data,
      timestamp: new Date().toISOString(),
      source: 'auth-service'
    };

    const routingKey = `event.${eventName.toLowerCase()}`;
    channel.publish(
      'url-shortener-events', 
      routingKey, 
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );
    
    logger.info(`Published event ${eventName} with routing key ${routingKey}`, { 
      eventName, 
      routingKey
    });
    return true;
  } catch (error) {
    logger.error(`Error publishing event ${eventName}:`, error);
    return false;
  }
};

// Initialize connection
connectRabbitMQ().catch(err => {
  logger.error('Failed to establish initial RabbitMQ connection:', err);
});

module.exports = {
  publishEvent,
  connectRabbitMQ
}; 