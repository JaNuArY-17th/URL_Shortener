# Notification Service

A comprehensive notification service for the URL Shortener microservices system that handles email notifications, real-time notifications via Socket.IO, and user notification preferences.

## Overview

The Notification Service is responsible for:
- Processing notification events from other microservices via RabbitMQ
- Sending email notifications using Nodemailer
- Managing real-time notifications through Socket.IO
- Storing and managing user notification preferences
- Providing APIs for notification management and user preferences

## Features

### 🔔 Multi-Channel Notifications
- **Email Notifications**: Welcome emails, OTP verification, password reset, URL creation alerts
- **Real-time Notifications**: Live updates via Socket.IO for instant user feedback
- **In-App Notifications**: Persistent notifications stored in database

### 📧 Email Service
- Support for multiple email providers (Gmail, SMTP)
- HTML and plain text email templates
- Batch processing for efficient email delivery
- Email delivery tracking and error handling

### ⚙️ User Preferences
- Granular notification settings per notification type
- Email frequency controls (immediate, hourly, daily, weekly)
- Device token management for push notifications
- Default preference creation for new users

### 🔄 Event-Driven Architecture
- Listens to events from other services via RabbitMQ
- Processes user creation, URL creation, and authentication events
- Publishes notification delivery status events

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Auth Service  │    │  URL Shortener   │    │ Other Services  │
│                 │    │     Service      │    │                 │
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                      │                       │
          └──────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      RabbitMQ           │
                    │   (Message Broker)      │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Notification Service   │
                    │                         │
                    │  ┌─────────────────┐   │
                    │  │ Message Handler │   │
                    │  └─────────────────┘   │
                    │  ┌─────────────────┐   │
                    │  │ Email Service   │   │
                    │  └─────────────────┘   │
                    │  ┌─────────────────┐   │
                    │  │ Socket Service  │   │
                    │  └─────────────────┘   │
                    └─────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │       MongoDB           │
                    │  (Notifications &       │
                    │   User Preferences)     │
                    └─────────────────────────┘
```

## API Endpoints

### Notifications Management

#### Get User Notifications
```http
GET /api/notifications?page=1&limit=10&read=false
Authorization: Bearer <token>
```

#### Mark Notification as Read
```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

#### Mark All Notifications as Read
```http
PUT /api/notifications/mark-all-read
Authorization: Bearer <token>
```

#### Delete Notification
```http
DELETE /api/notifications/:id
Authorization: Bearer <token>
```

### User Preferences

#### Get User Preferences
```http
GET /api/notifications/preferences
Authorization: Bearer <token>
```

#### Update User Preferences
```http
PUT /api/notifications/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": true,
  "inApp": true,
  "emailFrequency": "daily",
  "notificationSettings": {
    "urlCreation": {
      "email": true,
      "inApp": true
    },
    "milestones": {
      "email": false,
      "inApp": true
    },
    "system": {
      "email": false,
      "inApp": true
    }
  }
}
```

#### Register Device Token (for push notifications)
```http
POST /api/notifications/device-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "device_token_here",
  "device": "iOS/Android/Web"
}
```

### Health Check
```http
GET /api/health
```

## Event Processing

The service listens to the following RabbitMQ events:

### User Events
- **UserCreatedEvent**: Sends welcome email to new users
- **email.verification.requested**: Sends OTP verification emails
- **password.reset.requested**: Sends password reset emails
- **password.reset.completed**: Sends password reset confirmation

### URL Events
- **UrlCreatedEvent**: Notifies users when URLs are created
- **url.redirect**: Tracks URL usage for milestone notifications

## Configuration

### Environment Variables

#### Server Configuration
```bash
PORT=3004                           # Server port
NODE_ENV=development               # Environment (development/production)
```

#### Database Configuration
```bash
MONGODB_URI=mongodb://localhost:27017/notifications
```

#### RabbitMQ Configuration
```bash
RABBITMQ_URI=amqp://localhost:5672
```

#### Email Configuration
```bash
EMAIL_ENABLED=true                 # Enable/disable email service
EMAIL_SERVICE=gmail                # Email service (gmail/smtp)
EMAIL_HOST=smtp.gmail.com          # SMTP host (if using smtp)
EMAIL_PORT=587                     # SMTP port
EMAIL_SECURE=false                 # Use TLS
EMAIL_USER=your-email@gmail.com    # Email username
EMAIL_PASS=your-app-password       # Email password/app password
EMAIL_FROM=your-email@gmail.com    # From address
```

#### Socket.IO Configuration
```bash
SOCKET_IO_ENABLED=true             # Enable real-time notifications
SOCKET_IO_PATH=/api/notifications/socket.io
SOCKET_IO_CORS_ORIGIN=http://localhost:8080,http://localhost:3000
```

#### Notification Settings
```bash
NOTIFICATION_RETENTION_DAYS=30     # How long to keep notifications
DEFAULT_EMAIL_NOTIFICATIONS=true   # Default email preference for new users
DEFAULT_PUSH_NOTIFICATIONS=false   # Default push preference for new users
```

#### Rate Limiting
```bash
API_RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
API_RATE_LIMIT_MAX=100             # Max requests per window
```

#### CORS Configuration
```bash
CORS_ORIGINS=http://localhost:8080,http://localhost:3000,http://localhost:5000
```

## Data Models

### Notification Model
```javascript
{
  userId: String,           // User ID who receives the notification
  type: String,            // success, error, info, warning
  title: String,           // Notification title
  message: String,         // Notification message
  data: Object,            // Additional data (shortCode, originalUrl, etc.)
  read: Boolean,           // Whether notification has been read
  emailDelivered: Boolean, // Whether email was sent
  createdAt: Date,         // Creation timestamp
  updatedAt: Date          // Last update timestamp
}
```

### User Preference Model
```javascript
{
  userId: String,          // User ID
  email: Boolean,          // Enable email notifications
  push: Boolean,           // Enable push notifications
  inApp: Boolean,          // Enable in-app notifications
  emailFrequency: String,  // immediate, hourly, daily, weekly
  emailAddress: String,    // User's email address
  deviceTokens: [{         // Device tokens for push notifications
    token: String,
    device: String,
    lastUsed: Date
  }],
  notificationSettings: {  // Granular settings by type
    urlCreation: {
      email: Boolean,
      inApp: Boolean,
      push: Boolean
    },
    milestones: {
      email: Boolean,
      inApp: Boolean,
      push: Boolean
    },
    system: {
      email: Boolean,
      inApp: Boolean,
      push: Boolean
    }
  }
}
```

## Real-time Notifications

### Socket.IO Integration

The service provides real-time notifications through Socket.IO:

```javascript
// Client-side connection
const socket = io('http://localhost:3004', {
  path: '/api/notifications/socket.io',
  auth: {
    token: 'your-jwt-token'
  }
});

// Listen for notifications
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
});

// Listen for connection status
socket.on('connect', () => {
  console.log('Connected to notification service');
});
```

### Events Emitted
- **notification**: New notification for the user
- **notification_read**: Notification marked as read
- **preferences_updated**: User preferences updated

## Email Templates

### Welcome Email
Sent when a new user registers:
- Subject: "Welcome to URL Shortener"
- Contains welcome message and getting started information

### OTP Verification Email
Sent during registration or email verification:
- Subject: "Verify your email address"
- Contains 6-digit OTP code with expiration time

### Password Reset Email
Sent when user requests password reset:
- Subject: "Reset your password"
- Contains OTP code for password reset

### URL Creation Notification
Sent when user creates a new short URL:
- Subject: "URL Shortener: New short URL created"
- Contains short code and original URL information

## Development

### Prerequisites
- Node.js 18+
- MongoDB
- RabbitMQ

### Installation
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env
```

### Running the Service
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Docker Support
```bash
# Build Docker image
docker build -t notification-service .

# Run with Docker Compose
docker-compose up notification-service
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Email Testing
The service includes a test email endpoint for development:
```http
POST /api/notifications/test-email
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "test@example.com"
}
```

## Monitoring and Logging

### Health Checks
- **Basic Health**: `GET /api/health`
- **Deep Health**: `GET /api/health/deep` (checks MongoDB and RabbitMQ connections)

### Logging
- Uses Winston for structured logging
- Logs are written to `./logs/notification-service.log`
- Log levels: error, warn, info, debug
- Request IDs for tracing across services

### Metrics
- Email delivery success/failure rates
- Notification processing times
- Socket.IO connection counts
- API response times

## Security

### Authentication
- JWT token validation for all protected endpoints
- Token verification with Auth Service

### Rate Limiting
- API endpoints are rate-limited to prevent abuse
- Configurable limits per IP address

### Input Validation
- All input data is validated and sanitized
- Email addresses are validated before sending
- Device tokens are validated before storage

### CORS Protection
- Configurable CORS origins
- Credentials support for cross-origin requests

## Troubleshooting

### Common Issues

#### Email Not Sending
1. Check email configuration in environment variables
2. Verify email service credentials
3. Check email service logs for errors
4. Test with the test email endpoint

#### RabbitMQ Connection Issues
1. Verify RabbitMQ is running and accessible
2. Check connection URI format
3. Verify exchange and queue configurations
4. Check RabbitMQ logs for connection errors

#### Socket.IO Connection Problems
1. Verify CORS configuration
2. Check JWT token validity
3. Ensure Socket.IO path is correct
4. Check firewall and network settings

#### Database Connection Issues
1. Verify MongoDB is running
2. Check connection string format
3. Verify database permissions
4. Check network connectivity

### Debug Mode
Enable debug logging:
```bash
LOG_LEVEL=debug npm start
```

### Health Check Endpoints
Use health endpoints to verify service status:
```bash
# Basic health check
curl http://localhost:3004/api/health

# Deep health check (includes dependencies)
curl http://localhost:3004/api/health/deep
```

## API Documentation

Interactive API documentation is available at:
- Development: `http://localhost:3004/api-docs`
- Production: `https://your-domain.com/api-docs`

The documentation includes:
- Complete API reference
- Request/response examples
- Authentication requirements
- Error codes and messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style
- Use ESLint configuration provided
- Follow existing code patterns
- Add JSDoc comments for new functions
- Use meaningful variable and function names

## License

This project is part of the URL Shortener microservices system.