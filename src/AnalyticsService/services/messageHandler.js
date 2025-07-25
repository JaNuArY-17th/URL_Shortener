const amqp = require('amqplib');
const logger = require('./logger');
const config = require('../config/config');
const ClickEvent = require('../models/ClickEvent');
const UrlStat = require('../models/UrlStat');

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
    // Setup exchange
    await this.channel.assertExchange(config.rabbitmq.exchanges.urlEvents, 'topic', { durable: true });
    
    // Setup queue for redirect events
    const redirectQueue = await this.channel.assertQueue(config.rabbitmq.queues.redirectEvents, { durable: true });
    
    // Bind queue to exchange with routing key
    await this.channel.bindQueue(
      redirectQueue.queue,
      config.rabbitmq.exchanges.urlEvents,
      config.rabbitmq.routingKeys.urlRedirect
    );
    
    logger.info('RabbitMQ exchanges and queues configured');
  }

  /**
   * Start consuming messages from queues
   * @private
   * @returns {Promise<void>}
   */
  async startConsuming() {
    // Consume redirect events
    await this.channel.consume(
      config.rabbitmq.queues.redirectEvents,
      async (msg) => {
        try {
          if (!msg) return;
          
          const content = JSON.parse(msg.content.toString());
          logger.debug('Received redirect event:', content.shortCode);
          
          await this.processRedirectEvent(content);
          
          // Acknowledge message
          this.channel.ack(msg);
        } catch (err) {
          logger.error('Error processing message:', err);
          // Reject message and requeue
          this.channel.nack(msg, false, false);
        }
      }
    );
    
    logger.info('Started consuming messages from RabbitMQ');
  }

  /**
   * Process redirect event
   * @private
   * @param {Object} eventData - Redirect event data
   * @returns {Promise<void>}
   */
  async processRedirectEvent(eventData) {
    try {
      // Extract data from event
      const { 
        shortCode, 
        originalUrl, 
        visitorHash, 
        timestamp, 
        userAgent, 
        referer,
        ipHash,
        countryCode,
        userId 
      } = eventData;
      
      // Determine device type from user agent
      const deviceType = ClickEvent.detectDeviceType(userAgent);
      
      // Create click event record
      const clickEvent = new ClickEvent({
        shortCode,
        originalUrl,
        userId,
        visitorHash,
        timestamp: new Date(timestamp),
        ipHash,
        userAgent,
        referer,
        countryCode,
        deviceType
      });
      
      await clickEvent.save();
      logger.debug(`Saved click event for ${shortCode}`);
      
      // Update URL statistics
      await UrlStat.recordClick(shortCode, {
        deviceType,
        countryCode,
        referer,
        timestamp: new Date(timestamp)
      });
      
      // Check if this is a unique visitor
      const uniqueVisitors = await ClickEvent.countDocuments({
        shortCode,
        visitorHash
      });
      
      if (uniqueVisitors === 1) {
        // This is a unique visitor
        await UrlStat.recordUniqueVisitor(shortCode, visitorHash);
      }
      
    } catch (err) {
      logger.error(`Error processing redirect event for ${eventData?.shortCode}:`, err);
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
    }
    
    if (this.connection) {
      await this.connection.close();
    }
    
    this.connected = false;
    logger.info('Disconnected from RabbitMQ');
  }
}

// Create a singleton instance
const messageHandler = new MessageHandler();

module.exports = messageHandler; 