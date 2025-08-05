# AI Assistant Service - Environment Configuration

This document describes all environment variables used by the AI Assistant Service.

## Required Environment Variables

### AI Configuration
- **GEMINI_API_KEY**: Google Gemini API key for AI functionality (Required)
- **GEMINI_MODEL**: Gemini model to use (default: gemini-pro)

### Database Connections (Privacy-Aware Access)
- **MONGODB_ANALYTICS_URI**: MongoDB connection for analytics database
- **MONGODB_REDIRECT_URI**: MongoDB connection for redirect database  
- **MONGODB_NOTIFICATION_URI**: MongoDB connection for notification database
- **MONGODB_AUTH_URI**: MongoDB connection for auth database (limited access)

### Authentication
- **JWT_SECRET**: Secret key for JWT token verification (Required)
- **JWT_EXPIRES_IN**: JWT token expiration time (default: 24h)

## Optional Environment Variables

### Server Configuration
- **PORT**: Server port (default: 3000)
- **NODE_ENV**: Environment (development/production)

### CORS Configuration
- **CORS_ORIGINS**: Comma-separated list of allowed origins (default: localhost URLs)

### AI Settings
- **AI_MAX_TOKENS**: Maximum tokens for AI responses (default: 2048)
- **AI_TEMPERATURE**: AI response creativity (0-1, default: 0.7)
- **AI_ENABLE_CACHING**: Enable AI response caching (default: true)
- **AI_CACHE_TIMEOUT**: Cache timeout in seconds (default: 300)

### Privacy Settings
- **PRIVACY_ENABLE_USER_DATA**: Allow access to user data (default: false)
- **PRIVACY_HASH_USER_IDS**: Hash user IDs for privacy (default: true)
- **PRIVACY_DATA_RETENTION_DAYS**: Data retention period (default: 365)
- **PRIVACY_ANONYMIZE_AFTER_DAYS**: Anonymize data after days (default: 90)

### Rate Limiting
- **RATE_LIMIT_WINDOW_MS**: Rate limit window in ms (default: 900000 = 15min)
- **RATE_LIMIT_MAX_REQUESTS**: Max requests per window (default: 100)
- **AI_RATE_LIMIT_WINDOW_MS**: AI rate limit window (default: 60000 = 1min)
- **AI_RATE_LIMIT_MAX_REQUESTS**: Max AI requests per window (default: 10)

### Logging
- **LOG_LEVEL**: Logging level (debug/info/warn/error, default: info)
- **LOG_FORMAT**: Log format (json/simple, default: json)
- **LOG_ENABLE_CONSOLE**: Enable console logging (default: true)
- **LOG_ENABLE_FILE**: Enable file logging (default: false)
- **LOG_FILE_PATH**: Log file path (default: ./logs/ai-assistant.log)

### Analytics
- **DETAILED_ANALYTICS**: Enable detailed analytics (default: false)
- **DEFAULT_TIME_RANGE**: Default time range for queries (default: 7d)
- **MAX_DATA_POINTS**: Maximum data points to process (default: 10000)

### Cache Configuration
- **CACHE_ENABLED**: Enable caching (default: true)
- **CACHE_TTL**: Cache TTL in seconds (default: 300)
- **CACHE_MAX_SIZE**: Maximum cache size (default: 100)

## Example .env File

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_jwt_secret_here

# Database connections
MONGODB_ANALYTICS_URI=mongodb+srv://user:pass@cluster.mongodb.net/analytics
MONGODB_REDIRECT_URI=mongodb+srv://user:pass@cluster.mongodb.net/redirect
MONGODB_NOTIFICATION_URI=mongodb+srv://user:pass@cluster.mongodb.net/notification
MONGODB_AUTH_URI=mongodb+srv://user:pass@cluster.mongodb.net/auth

# Server
PORT=3006
NODE_ENV=development

# CORS
CORS_ORIGINS=http://localhost:8080,http://localhost:3000,http://localhost:5000

# AI Settings
AI_MAX_TOKENS=2048
AI_TEMPERATURE=0.7
AI_ENABLE_CACHING=true

# Privacy
PRIVACY_ENABLE_USER_DATA=false
PRIVACY_HASH_USER_IDS=true

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
AI_RATE_LIMIT_MAX_REQUESTS=10

# Logging
LOG_LEVEL=info
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_FILE=false
```

## Docker Environment

When running with Docker Compose, add the AI Assistant Service:

```yaml
ai-assistant-service:
  build:
    context: ./src/AIAssistantService
    dockerfile: Dockerfile
  ports:
    - "5006:3000"
  environment:
    - GEMINI_API_KEY=${GEMINI_API_KEY}
    - JWT_SECRET=${JWT_SECRET}
    - MONGODB_ANALYTICS_URI=${MONGODB_ANALYTICS_URI}
    - MONGODB_REDIRECT_URI=${MONGODB_REDIRECT_URI}
    - MONGODB_NOTIFICATION_URI=${MONGODB_NOTIFICATION_URI}
    - MONGODB_AUTH_URI=${MONGODB_AUTH_URI}
    - PORT=3000
    - NODE_ENV=production
```

## Security Notes

1. **Never commit API keys** to version control
2. **Use strong JWT secrets** in production
3. **Limit database access** - AI service has read-only access to user data
4. **Enable rate limiting** to prevent abuse
5. **Monitor AI usage** to control costs
6. **Hash sensitive data** when possible

## Privacy Compliance

The AI Assistant Service is designed with privacy in mind:

- **Limited user data access**: Only accesses non-sensitive user information
- **Data anonymization**: User IDs are hashed by default
- **Configurable privacy**: Can disable user data access entirely
- **Audit logging**: All AI requests are logged for compliance
- **Data retention**: Configurable data retention and anonymization periods