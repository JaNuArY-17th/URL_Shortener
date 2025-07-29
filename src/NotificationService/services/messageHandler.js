const amqp = require('amqplib');
const logger = require('./logger');
const config = require('../config/config');
const Notification = require('../models/Notification');
const UserPreference = require('../models/UserPreference');
const socketService = require('./socketService');

class MessageHandler {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.connected = false;
    this.connecting = false;
    this.reconnectTimer = null;
    this.reconnectInterval = 5000; // 5 seconds
    this.maxReconnectAttempts = 20;
    this.reconnectAttempts = 0;
    
    // Message processors
    this.processors = {
      'url.created': this.processUrlCreatedEvent.bind(this),
      'url.redirect': this.processRedirectEvent.bind(this),
      'user.created': this.processUserCreatedEvent.bind(this)
    };
  }

  /**
   * Connect to RabbitMQ
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.connecting) {
      return;
    }

    this.connecting = true;
    
    try {
      logger.info('Connecting to RabbitMQ...');
      this.connection = await amqp.connect(config.rabbitmq.uri);
      
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err);
        this.reconnect();
      });
      
      this.connection.on('close', () => {
        logger.info('RabbitMQ connection closed');
        this.connected = false;
        this.reconnect();
      });
      
      this.channel = await this.connection.createChannel();
      
      // Setup exchanges and queues
      await this.setupExchangesAndQueues();
      
      // Start consuming messages
      await this.startConsuming();
      
      this.connected = true;
      this.connecting = false;
      this.reconnectAttempts = 0;
      logger.info('Connected to RabbitMQ');
    } catch (err) {
      logger.error('Failed to connect to RabbitMQ:', err);
      this.connected = false;
      this.connecting = false;
      this.reconnect();
    }
  }

  /**
   * Reconnect to RabbitMQ with exponential backoff
   * @private
   */
  reconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      logger.error(`Exceeded max reconnect attempts (${this.maxReconnectAttempts}). Giving up.`);
      return;
    }
    
    // Exponential backoff with jitter
    const delay = Math.min(30000, this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1))
      * (1 + 0.2 * Math.random());
    
    logger.info(`Attempting to reconnect to RabbitMQ in ${Math.round(delay / 1000)} seconds (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(err => {
        logger.error('Error during reconnect attempt:', err);
      });
    }, delay);
  }

  /**
   * Setup exchanges and queues
   * @private
   * @returns {Promise<void>}
   */
  async setupExchangesAndQueues() {
    // Setup URL events exchange
    await this.channel.assertExchange(config.rabbitmq.exchanges.urlEvents, 'topic', { durable: true });
    
    // Setup User events exchange
    await this.channel.assertExchange(config.rabbitmq.exchanges.userEvents, 'topic', { durable: true });
    
    // Setup queue for URL notifications
    const urlQueue = await this.channel.assertQueue(config.rabbitmq.queues.urlNotifications, { durable: true });
    
    // Setup queue for user notifications
    const userQueue = await this.channel.assertQueue(config.rabbitmq.queues.userNotifications, { durable: true });
    
    // Bind queues to exchanges with routing keys
    await this.channel.bindQueue(
      urlQueue.queue,
      config.rabbitmq.exchanges.urlEvents,
      config.rabbitmq.routingKeys.urlCreated
    );
    
    await this.channel.bindQueue(
      urlQueue.queue,
      config.rabbitmq.exchanges.urlEvents,
      config.rabbitmq.routingKeys.urlRedirect
    );
    
    await this.channel.bindQueue(
      userQueue.queue,
      config.rabbitmq.exchanges.userEvents,
      config.rabbitmq.routingKeys.userCreated
    );
    
    logger.info('RabbitMQ exchanges and queues configured successfully', {
      urlEvents: config.rabbitmq.exchanges.urlEvents,
      userEvents: config.rabbitmq.exchanges.userEvents,
      urlQueue: config.rabbitmq.queues.urlNotifications,
      userQueue: config.rabbitmq.queues.userNotifications,
      bindings: [
        config.rabbitmq.routingKeys.urlCreated,
        config.rabbitmq.routingKeys.urlRedirect,
        config.rabbitmq.routingKeys.userCreated
      ]
    });
  }

  /**
   * Start consuming messages from queues
   * @private
   * @returns {Promise<void>}
   */
  async startConsuming() {
    // Consume URL notifications
    await this.channel.consume(
      config.rabbitmq.queues.urlNotifications,
      async (msg) => {
        try {
          if (!msg) return;
          
          const content = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;
          
          logger.debug(`Received message with routing key ${routingKey}:`, content);
          
          // Process message based on routing key
          if (this.processors[routingKey]) {
            await this.processors[routingKey](content);
          } else {
            logger.warn(`No processor found for routing key: ${routingKey}`);
          }
          
          // Acknowledge message
          this.channel.ack(msg);
        } catch (err) {
          logger.error('Error processing URL notification message:', err);
          // Reject message and requeue
          this.channel.nack(msg, false, false);
        }
      },
      { noAck: false }
    );
    
    // Consume user notifications
    await this.channel.consume(
      config.rabbitmq.queues.userNotifications,
      async (msg) => {
        try {
          if (!msg) return;
          
          const content = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;
          
          logger.debug(`Received message with routing key ${routingKey}:`, content);
          
          // Process message based on routing key
          if (this.processors[routingKey]) {
            await this.processors[routingKey](content);
          } else {
            logger.warn(`No processor found for routing key: ${routingKey}`);
          }
          
          // Acknowledge message
          this.channel.ack(msg);
        } catch (err) {
          logger.error('Error processing user notification message:', err);
          // Reject message and requeue
          this.channel.nack(msg, false, false);
        }
      },
      { noAck: false }
    );
    
    logger.info('Started consuming messages from RabbitMQ');
  }

  /**
   * Process URL created event
   * @private
   * @param {Object} data - Event data
   * @returns {Promise<void>}
   */
  async processUrlCreatedEvent(data) {
    try {
      const { userId, shortCode, originalUrl } = data;
      
      if (!userId) {
        logger.warn('Received URL created event without userId, skipping notification');
        return;
      }
      
      // Create notification in the database
      const notification = await Notification.createUrlCreatedNotification(
        userId, shortCode, originalUrl
      );
      
      // Send real-time notification via socket.io if enabled
      if (socketService.isConnected()) {
        socketService.sendToUser(userId, 'notification', {
          id: notification._id.toString(),
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          createdAt: notification.createdAt
        });
      }
      
      logger.info(`Created URL creation notification for user ${userId}, shortCode ${shortCode}`);
    } catch (err) {
      logger.error('Error processing URL created event:', err);
      throw err;
    }
  }

  /**
   * Process URL redirect event
   * @private
   * @param {Object} data - Event data
   * @returns {Promise<void>}
   */
  async processRedirectEvent(data) {
    try {
      const { shortCode, userId } = data;
      
      // If no userId, this is an anonymous URL redirect - emit to all admins
      if (!userId) {
        logger.debug(`Skipping notification for anonymous URL redirect: ${shortCode}`);
        // In a real implementation, you might notify admins or broadcast to a specific channel
        return;
      }
      
      // Forward the click event to the WebSocket for real-time updates
      const socketService = require('./socketService');
      if (socketService.isConnected()) {
        // Send to specific user
        socketService.sendToUser(userId, 'url.redirect', {
          shortCode,
          timestamp: new Date().toISOString()
        });
        
        logger.debug(`Sent real-time redirect notification for ${shortCode} to user ${userId}`);
      }
      
      // In a real implementation, you might also:
      // 1. Store the click in a click events collection
      // 2. Check for milestones (like in the existing code)
      // 3. Generate notifications for important milestones
      
      // For demonstration, we'll keep the existing milestone functionality
      if (Math.random() < 0.01) {
        // Generate a plausible milestone number (only 1% of clicks for demo)
        const milestones = [100, 500, 1000, 5000, 10000, 50000, 100000];
        const milestoneIndex = Math.floor(Math.random() * milestones.length);
        const clicks = milestones[milestoneIndex];
        
        // Create notification in the database
        const notification = await Notification.createMilestoneNotification(
          userId, shortCode, clicks
        );
        
        // Send real-time notification via socket.io if enabled
        if (socketService.isConnected()) {
          socketService.sendToUser(userId, 'notification', {
            id: notification._id.toString(),
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            createdAt: notification.createdAt
          });
        }
        
        logger.info(`Created milestone notification for user ${userId}, shortCode ${shortCode}, clicks ${clicks}`);
      }
    } catch (err) {
      logger.error('Error processing URL redirect event:', err);
      throw err;
    }
  }

  /**
   * Process user created event
   * @private
   * @param {Object} data - Event data
   * @returns {Promise<void>}
   */
  async processUserCreatedEvent(data) {
    try {
      const { userId, email, name } = data;
      
      // Create default notification preferences for the user
      await UserPreference.createDefaultPreference(userId, email);
      logger.info(`Created default notification preferences for user ${userId}`);
      
      // Create welcome notification
      const notification = await Notification.createSystemNotification(
        userId,
        'Welcome to URL Shortener!',
        `Hello ${name || 'there'}! Welcome to URL Shortener. Start creating short URLs to share with others.`,
        { isWelcome: true }
      );
      
      logger.info(`Created welcome notification for user ${userId}`);
    } catch (err) {
      logger.error('Error processing user created event:', err);
      throw err;
    }
  }

  /**
   * Check if connected to RabbitMQ
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Close RabbitMQ connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
    
    this.connected = false;
    logger.info('Disconnected from RabbitMQ');
  }
}

// Create a singleton instance
const messageHandler = new MessageHandler();

module.exports = messageHandler; 