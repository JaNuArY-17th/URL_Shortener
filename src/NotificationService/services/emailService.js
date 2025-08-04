const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('./logger');
const Notification = require('../models/Notification');

class EmailService {
  constructor() {
    this.initialized = false;
    this.transporter = null;
    this.initPromise = null;
    this.initialize();
  }

  /**
   * Initialize email service
   * @returns {Promise} Promise that resolves when initialization is complete
   */
  initialize() {
    if (!config.email.enabled) {
      logger.info('Email service disabled by configuration');
      this.initPromise = Promise.resolve(false);
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve) => {
      try {
        this.transporter = nodemailer.createTransport({
          service: config.email.service !== 'smtp' ? config.email.service : undefined,
          host: config.email.service === 'smtp' ? config.email.host : undefined,
          port: config.email.service === 'smtp' ? config.email.port : undefined,
          secure: config.email.secure,
          auth: {
            user: config.email.auth.user,
            pass: config.email.auth.pass
          }
        });

        logger.info('Email service initialized');
        this.initialized = true;
        resolve(true);
      } catch (err) {
        logger.error('Failed to initialize email service:', err);
        this.initialized = false;
        resolve(false);
      }
    });

    return this.initPromise;
  }

  /**
   * Check if email service is initialized and enabled
   * @returns {boolean} Whether the service is ready
   */
  isReady() {
    return this.initialized && config.email.enabled;
  }

  /**
   * Wait for email service to be ready
   * @returns {Promise<boolean>} Promise that resolves to whether service is ready
   */
  async waitForReady() {
    await this.initPromise;
    return this.isReady();
  }

  /**
   * Send a single email
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} text - Plain text email body
   * @param {string} html - HTML email body
   * @returns {Promise} Send result
   */
  async sendEmail(to, subject, text, html) {
    // Wait for initialization to complete before checking isReady
    await this.waitForReady();

    if (!this.isReady()) {
      logger.warn('Email service not ready, skipping email send');
      return null;
    }

    try {
      const mailOptions = {
        from: config.email.from,
        to,
        subject,
        text,
        html: html || text
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${to}: ${subject}`);
      return result;
    } catch (err) {
      logger.error('Failed to send email:', err);
      throw err;
    }
  }

  /**
   * Send notification email
   * @param {string} to - Recipient email address
   * @param {Object} notification - Notification object
   * @returns {Promise} Send result
   */
  async sendNotificationEmail(to, notification) {
    const subject = `URL Shortener: ${notification.title}`;
    const text = notification.message;

    // Generate simple HTML version
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a6ee0;">${notification.title}</h2>
        <p>${notification.message}</p>
        ${notification.data && notification.data.shortCode ?
        `<p>Short Code: <strong>${notification.data.shortCode}</strong></p>` : ''}
        ${notification.data && notification.data.originalUrl ?
        `<p>Original URL: <a href="${notification.data.originalUrl}">${notification.data.originalUrl}</a></p>` : ''}
        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated message from URL Shortener Service.
          <br>
          You can change your notification preferences in your account settings.
        </p>
      </div>
    `;

    return this.sendEmail(to, subject, text, html);
  }

  /**
   * Send welcome email to new user
   * @param {string} to - User email address
   * @param {string} username - Username or full name
   * @returns {Promise} Send result
   */
  async sendWelcomeEmail(to, username) {
    const subject = 'Welcome to URL Shortener Service';
    const name = username || 'there';

    const text = `Welcome ${name}!\n\nThank you for creating an account with URL Shortener. Your account has been successfully created.\n\nYou can now start creating shortened URLs and tracking their performance.\n\nBest regards,\nURL Shortener Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a6ee0;">Welcome to URL Shortener!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for creating an account with URL Shortener. Your account has been successfully created.</p>
        <p>You can now start creating shortened URLs and tracking their performance.</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px; text-align: center;">
          <a href="${config.services.webUi}" style="background-color: #4a6ee0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Get Started
          </a>
        </div>
        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated message from URL Shortener Service.
          <br>
          You can change your notification preferences in your account settings.
        </p>
      </div>
    `;

    // Send regardless of user preferences as this is a system email
    return this.sendEmail(to, subject, text, html);
  }

  /**
   * Send URL shortened success email
   * @param {string} to - User email address
   * @param {Object} userPreference - User preferences
   * @param {string} shortCode - The shortened URL code
   * @param {string} originalUrl - The original URL
   * @returns {Promise} Send result or null if user preferences disallow
   */
  async sendUrlShortenedEmail(to, userPreference, shortCode, originalUrl) {
    // Check if user wants to receive URL creation emails
    if (!userPreference?.email || !userPreference?.notificationSettings?.urlCreation?.email) {
      logger.debug(`User ${userPreference?.userId} has disabled URL creation emails`);
      return null;
    }

    const shortUrl = `${config.services.redirectService}/${shortCode}`;
    const subject = 'URL Successfully Shortened';

    const text = `Your URL has been successfully shortened!\n\nOriginal URL: ${originalUrl}\nShort URL: ${shortUrl}\n\nYou can track clicks and analytics for this URL in your dashboard.\n\nBest regards,\nURL Shortener Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a6ee0;">URL Successfully Shortened</h2>
        <p>Your URL has been successfully shortened!</p>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
          <p><strong>Original URL:</strong><br>
          <a href="${originalUrl}">${originalUrl}</a></p>
          
          <p><strong>Short URL:</strong><br>
          <a href="${shortUrl}">${shortUrl}</a></p>
        </div>
        
        <p>You can track clicks and analytics for this URL in your dashboard.</p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated message from URL Shortener Service.
          <br>
          You can change your notification preferences in your account settings.
        </p>
      </div>
    `;

    return this.sendEmail(to, subject, text, html);
  }

  /**
   * Process batch of pending notifications
   * @param {Array} notifications - Array of notifications to send
   * @param {Array} preferences - Array of user preferences
   * @returns {Promise<number>} Number of emails sent
   */
  async processBatch(notifications, preferences) {
    // Wait for initialization to complete
    await this.waitForReady();

    if (!this.isReady()) {
      logger.warn('Email service not ready, skipping batch processing');
      return 0;
    }

    // Map user preferences by userId
    const userPreferencesMap = preferences.reduce((map, pref) => {
      map[pref.userId] = pref;
      return map;
    }, {});

    const sentNotificationIds = [];
    const failedNotificationIds = [];

    for (const notification of notifications) {
      try {
        const userPref = userPreferencesMap[notification.userId];

        // Skip if user has no preferences or no email address
        if (!userPref || !userPref.emailAddress) continue;

        // Skip if user disabled email notifications
        if (!userPref.email) continue;

        // Check specific notification type preferences
        const notificationType = notification.type === 'success' && notification.data?.shortCode ?
          'urlCreation' :
          (notification.type === 'info' && notification.data?.clicks ? 'milestones' : 'system');

        if (!userPref.notificationSettings[notificationType]?.email) continue;

        // Send the email
        await this.sendNotificationEmail(userPref.emailAddress, notification);

        // Mark as sent
        sentNotificationIds.push(notification._id);
      } catch (err) {
        logger.error(`Failed to send notification email for ${notification._id}:`, err);
        failedNotificationIds.push(notification._id);
      }
    }

    // Update notifications as delivered
    if (sentNotificationIds.length > 0) {
      await Notification.markAsEmailDelivered(sentNotificationIds);
    }

    logger.info(`Batch processing complete. Sent: ${sentNotificationIds.length}, Failed: ${failedNotificationIds.length}`);
    return sentNotificationIds.length;
  }

  /**
   * Send a test email
   * @param {string} to - Recipient email address
   * @returns {Promise} Send result
   */
  async sendTestEmail(to) {
    const subject = 'Test Email from URL Shortener Notification Service';
    const text = 'This is a test email from URL Shortener Notification Service. If you received this, the email service is working correctly.';

    return this.sendEmail(to, subject, text);
  }
}

// Create a singleton instance
const emailService = new EmailService();

module.exports = emailService; 