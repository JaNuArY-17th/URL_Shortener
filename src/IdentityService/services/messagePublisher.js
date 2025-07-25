const amqp = require('amqplib');

// RabbitMQ connection
let channel = null;

// Connect to RabbitMQ
const connectRabbitMQ = async () => {
  if (channel) return channel;

  try {
    const connectionString = process.env.RABBITMQ_URI || 'amqp://localhost:5672';
    const connection = await amqp.connect(connectionString);
    channel = await connection.createChannel();
    
    // Exchange for event publishing
    await channel.assertExchange('url-shortener-events', 'topic', {
      durable: true
    });
    
    console.log('Connected to RabbitMQ');
    return channel;
  } catch (error) {
    console.error('Error connecting to RabbitMQ:', error.message);
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
      source: 'identity-service'
    };

    const routingKey = `event.${eventName.toLowerCase()}`;
    channel.publish(
      'url-shortener-events', 
      routingKey, 
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );
    
    console.log(`Published event ${eventName} with routing key ${routingKey}`);
    return true;
  } catch (error) {
    console.error(`Error publishing event ${eventName}:`, error);
    return false;
  }
};

// Initialize connection
connectRabbitMQ().catch(err => {
  console.error('Failed to establish initial RabbitMQ connection:', err);
});

module.exports = {
  publishEvent,
  connectRabbitMQ
}; 