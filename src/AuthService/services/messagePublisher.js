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
    
    // Exchanges for event publishing
    await channel.assertExchange('url-shortener-events', 'topic', {
      durable: true
    });
    
    await channel.assertExchange('user-events', 'topic', {
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

    // Map event names to proper routing keys
    const routingKeyMap = {
      'password.reset.requested': 'password.reset.requested',
      'password.reset.completed': 'password.reset.completed',
      'UserCreatedEvent': 'user.created'
    };
    
    const routingKey = routingKeyMap[eventName] || `event.${eventName.toLowerCase()}`;
    
    // Use user-events exchange for password reset events
    const exchange = (eventName.includes('password.reset') || eventName === 'UserCreatedEvent') 
      ? 'user-events' 
      : 'url-shortener-events';
    
    channel.publish(
      exchange, 
      routingKey, 
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );
    
    logger.info(`Published event ${eventName} with routing key ${routingKey} to exchange ${exchange}`, { 
      eventName, 
      routingKey,
      exchange
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