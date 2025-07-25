const amqp = require('amqplib');
const { setUrlInCache, deleteUrlFromCache } = require('./cacheService');
const Url = require('../models/Url');

// RabbitMQ connection
let channel = null;

/**
 * Connect to RabbitMQ and set up message consumers
 */
const connectRabbitMQ = async () => {
  try {
    const connectionString = process.env.RABBITMQ_URI || 'amqp://localhost:5672';
    const connection = await amqp.connect(connectionString);
    channel = await connection.createChannel();
    
    // Set up exchange
    await channel.assertExchange('url-shortener-events', 'topic', { durable: true });
    
    // Set up queues
    const { queue: urlCreatedQueue } = await channel.assertQueue('redirect-service-url-created', { 
      durable: true 
    });
    
    // Bind queues to exchange with routing patterns
    await channel.bindQueue(urlCreatedQueue, 'url-shortener-events', 'event.urlcreatedevent');
    
    // Consume UrlCreatedEvent to warm up the cache
    channel.consume(urlCreatedQueue, async (msg) => {
      if (!msg) return;
      
      try {
        const event = JSON.parse(msg.content.toString());
        console.log('Received URL created event:', event.eventName);
        
        if (event.data && event.data.shortCode && event.data.originalUrl) {
          await setUrlInCache(event.data.shortCode, event.data.originalUrl);
          console.log(`Cached URL ${event.data.shortCode}`);
        }
        
        channel.ack(msg);
      } catch (error) {
        console.error('Error processing URL created event:', error);
        channel.nack(msg, false, false);
      }
    });
    
    console.log('RabbitMQ consumers set up successfully');
    return channel;
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error);
    return null;
  }
};

/**
 * Publish redirect event to RabbitMQ
 * @param {Object} eventData Event data
 * @returns {Promise<boolean>} Success status
 */
const publishRedirectEvent = async (eventData) => {
  if (!channel) {
    try {
      channel = await connectRabbitMQ();
      if (!channel) return false;
    } catch (error) {
      console.error('Failed to reconnect to RabbitMQ:', error);
      return false;
    }
  }
  
  try {
    const event = {
      eventName: 'RedirectOccurredEvent',
      data: eventData,
      timestamp: new Date().toISOString(),
      source: 'redirect-service'
    };
    
    channel.publish(
      'url-shortener-events',
      'event.redirectoccurredevent',
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );
    
    console.log(`Published redirect event for ${eventData.shortCode}`);
    return true;
  } catch (error) {
    console.error('Error publishing redirect event:', error);
    return false;
  }
};

module.exports = {
  connectRabbitMQ,
  publishRedirectEvent
}; 