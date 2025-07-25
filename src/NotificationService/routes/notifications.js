const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const UserPreference = require('../models/UserPreference');
const { authenticate } = require('../middleware/authenticate');
const logger = require('../services/logger');
const socketService = require('../services/socketService');
const rateLimit = require('express-rate-limit');
const config = require('../config/config');

// Rate limiter for notifications API
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.api.windowMs,
  max: config.rateLimit.api.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.'
  }
});

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     description: Retrieve notifications for the authenticated user
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: read
 *         schema:
 *           type: boolean
 *         description: Filter by read status (true/false)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [info, success, warning, error, url, system]
 *         description: Filter by notification type
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Authentication error
 *       429:
 *         description: Too many requests
 */
router.get('/', authenticate, apiLimiter, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build query
    const query = { userId, deleted: false };
    
    // Add filters
    if (req.query.read !== undefined) {
      query.read = req.query.read === 'true';
    }
    
    if (req.query.type) {
      query.type = req.query.type;
    }
    
    // Get notifications with pagination
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const total = await Notification.countDocuments(query);
    
    res.status(200).json({
      notifications,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notifications count
 *     description: Get count of unread notifications for the user
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
 *       401:
 *         description: Authentication error
 */
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get count of unread notifications
    const count = await Notification.getUnreadCount(userId);
    
    res.status(200).json({
      unreadCount: count
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/{id}:
 *   get:
 *     summary: Get notification by ID
 *     description: Get a specific notification by ID
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification data
 *       401:
 *         description: Authentication error
 *       404:
 *         description: Notification not found
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    
    // Get notification
    const notification = await Notification.findOne({ _id: notificationId, userId, deleted: false });
    
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }
    
    res.status(200).json(notification);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark notification as read
 *     description: Mark a specific notification as read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Authentication error
 *       404:
 *         description: Notification not found
 */
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    
    // Find notification
    const notification = await Notification.findOne({ _id: notificationId, userId, deleted: false });
    
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }
    
    // Mark as read
    notification.read = true;
    await notification.save();
    
    // Send socket update if needed
    if (socketService.isConnected()) {
      socketService.sendToUser(userId, 'notificationUpdate', {
        id: notificationId,
        read: true
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   put:
 *     summary: Mark all notifications as read
 *     description: Mark all unread notifications for the user as read
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Authentication error
 */
router.put('/mark-all-read', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Update all unread notifications
    const result = await Notification.updateMany(
      { userId, read: false, deleted: false },
      { read: true }
    );
    
    // Send socket update if needed
    if (socketService.isConnected()) {
      socketService.sendToUser(userId, 'allNotificationsRead', {
        count: result.modifiedCount
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read',
      count: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     description: Delete a specific notification (soft delete)
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted
 *       401:
 *         description: Authentication error
 *       404:
 *         description: Notification not found
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    
    // Find notification
    const notification = await Notification.findOne({ _id: notificationId, userId, deleted: false });
    
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification not found'
      });
    }
    
    // Soft delete
    notification.deleted = true;
    await notification.save();
    
    // Send socket update if needed
    if (socketService.isConnected()) {
      socketService.sendToUser(userId, 'notificationDeleted', {
        id: notificationId
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Notification deleted'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     description: Get notification preferences for the authenticated user
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's notification preferences
 *       401:
 *         description: Authentication error
 */
router.get('/preferences', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get preferences, create if not exists
    const preferences = await UserPreference.getOrCreatePreference(userId, req.user.email);
    
    res.status(200).json(preferences);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/preferences:
 *   put:
 *     summary: Update notification preferences
 *     description: Update notification preferences for the authenticated user
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: boolean
 *               push:
 *                 type: boolean
 *               inApp:
 *                 type: boolean
 *               emailFrequency:
 *                 type: string
 *                 enum: [immediate, hourly, daily, weekly]
 *               notificationSettings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Preferences updated
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication error
 */
router.put('/preferences', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updates = req.body;
    
    // Validate the updates
    const validFields = ['email', 'push', 'inApp', 'emailFrequency', 'notificationSettings'];
    const updateFields = {};
    
    for (const field of validFields) {
      if (updates[field] !== undefined) {
        updateFields[field] = updates[field];
      }
    }
    
    // Update preferences
    const preferences = await UserPreference.findOneAndUpdate(
      { userId },
      { $set: updateFields },
      { new: true, upsert: true }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Preferences updated',
      preferences
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/device-token:
 *   post:
 *     summary: Register device token
 *     description: Register a device token for push notifications
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *               device:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device token registered
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication error
 */
router.post('/device-token', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { token, device } = req.body;
    
    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is required'
      });
    }
    
    // Add device token
    await UserPreference.addDeviceToken(userId, token, device || 'unknown');
    
    res.status(200).json({
      status: 'success',
      message: 'Device token registered'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/notifications/device-token:
 *   delete:
 *     summary: Remove device token
 *     description: Remove a device token for push notifications
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Device token removed
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication error
 */
router.delete('/device-token', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is required'
      });
    }
    
    // Remove device token
    await UserPreference.removeDeviceToken(userId, token);
    
    res.status(200).json({
      status: 'success',
      message: 'Device token removed'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 