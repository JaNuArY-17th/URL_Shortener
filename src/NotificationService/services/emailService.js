const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('./logger');
const Notification = require('../models/Notification');

class EmailService {
  constructor() {
    this.initialized = false;
    this.transporter = null;
    this.initialize();
  }

  /**
   * Initialize email service
   */
  initialize() {
    if (!config.email.enabled) {
      logger.info('Email service disabled by configuration');
      return;
    }

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
    } catch (err) {
      logger.error('Failed to initialize email service:', err);
      this.initialized = false;
    }
  }

  /**
   * Check if email service is initialized and enabled
   * @returns {boolean} Whether the service is ready
   */
  isReady() {
    return this.initialized && config.email.enabled;
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
   * Process batch of pending notifications
   * @param {Array} notifications - Array of notifications to send
   * @param {Array} preferences - Array of user preferences
   * @returns {Promise<number>} Number of emails sent
   */
  async processBatch(notifications, preferences) {
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