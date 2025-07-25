const { Server } = require('socket.io');
const logger = require('./logger');
const config = require('../config/config');
const jwt = require('jsonwebtoken');

class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> Set of socket ids
    this.socketUsers = new Map(); // socketId -> userId
    this.initialized = false;
  }

  /**
   * Initialize Socket.IO server
   * @param {Object} server - HTTP server instance
   */
  initialize(server) {
    if (!config.socketIO.enabled) {
      logger.info('Socket.IO is disabled by configuration');
      return;
    }

    try {
      // Create Socket.IO server with CORS configuration
      this.io = new Server(server, {
        cors: config.socketIO.cors
      });

      // Authentication middleware
      this.io.use((socket, next) => {
        try {
          const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
          
          if (!token) {
            logger.debug('Socket connection rejected - no token provided');
            return next(new Error('Authentication error'));
          }
          
          // Verify JWT token
          const decoded = jwt.verify(token, config.jwt.secret);
          socket.user = { id: decoded.id };
          next();
        } catch (err) {
          logger.warn('Socket authentication error:', err);
          next(new Error('Authentication error'));
        }
      });

      // Connection event
      this.io.on('connection', (socket) => {
        const userId = socket.user?.id;
        if (!userId) {
          logger.warn('Socket connected but no user ID found');
          socket.disconnect(true);
          return;
        }
        
        logger.debug(`User ${userId} connected with socket ${socket.id}`);
        
        // Track user's sockets
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(socket.id);
        this.socketUsers.set(socket.id, userId);
        
        // Join user-specific room
        socket.join(`user:${userId}`);
        
        // Welcome event with unread notifications count (to be implemented)
        socket.emit('connected', { message: 'Connected to notification service' });
        
        // Handle disconnect
        socket.on('disconnect', () => {
          logger.debug(`Socket ${socket.id} disconnected (user: ${userId})`);
          
          // Clean up tracking
          const userSocketsSet = this.userSockets.get(userId);
          if (userSocketsSet) {
            userSocketsSet.delete(socket.id);
            if (userSocketsSet.size === 0) {
              this.userSockets.delete(userId);
            }
          }
          this.socketUsers.delete(socket.id);
        });
        
        // Event: Mark notification as read
        socket.on('markRead', async (data) => {
          if (!data || !data.id) {
            socket.emit('error', { message: 'Invalid notification ID' });
            return;
          }
          
          try {
            // Ideally, here we'd call the notification service to mark as read
            // For now, we just acknowledge
            socket.emit('markedRead', { id: data.id });
          } catch (err) {
            logger.error('Error marking notification as read:', err);
            socket.emit('error', { message: 'Failed to mark notification as read' });
          }
        });
      });

      this.initialized = true;
      logger.info('Socket.IO server initialized');
    } catch (err) {
      logger.error('Failed to initialize Socket.IO:', err);
      this.initialized = false;
    }
  }

  /**
   * Check if Socket.IO server is initialized
   * @returns {boolean}
   */
  isConnected() {
    return this.initialized && this.io !== null;
  }

  /**
   * Get number of connected clients
   * @returns {number}
   */
  getConnectedClientsCount() {
    if (!this.isConnected()) return 0;
    return this.io.engine.clientsCount;
  }

  /**
   * Send event to a specific user
   * @param {string} userId - User ID
   * @param {string} event - Event name
   * @param {Object} data - Event data
   * @returns {boolean} Whether the message was sent
   */
  sendToUser(userId, event, data) {
    if (!this.isConnected()) {
      logger.warn('Socket.IO not connected, message not sent');
      return false;
    }

    // Send to user's room
    this.io.to(`user:${userId}`).emit(event, data);
    
    // Check if we actually sent to any sockets
    const userSockets = this.userSockets.get(userId);
    const socketCount = userSockets ? userSockets.size : 0;
    
    if (socketCount > 0) {
      logger.debug(`Sent ${event} to user ${userId} (${socketCount} sockets)`);
      return true;
    } else {
      logger.debug(`User ${userId} not connected, message not delivered in real-time`);
      return false;
    }
  }

  /**
   * Broadcast event to all connected clients
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  broadcast(event, data) {
    if (!this.isConnected()) {
      logger.warn('Socket.IO not connected, broadcast not sent');
      return;
    }
    
    this.io.emit(event, data);
    logger.debug(`Broadcast ${event} to all users`);
  }

  /**
   * Close all connections
   */
  close() {
    if (this.io) {
      this.io.close();
      this.io = null;
      this.userSockets.clear();
      this.socketUsers.clear();
      this.initialized = false;
      logger.info('Socket.IO server closed');
    }
  }
}

// Create a singleton instance
const socketService = new SocketService();

module.exports = socketService; 