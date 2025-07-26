# Hướng dẫn cấu hình môi trường cho API Gateway

API Gateway sử dụng các biến môi trường sau. Tạo một file `.env` trong thư mục root với các biến sau:

## Server Configuration
```
PORT=5000
NODE_ENV=development
```

## JWT Configuration
```
JWT_SECRET=your-256-bit-secret-key-here-minimum-16-characters
JWT_ISSUER=auth-service
JWT_AUDIENCE=url-shortener-api
JWT_EXPIRY=60m
```

## Services URLs - Development
```
AUTH_SERVICE_URL=http://auth-service:3000
URL_SHORTENER_SERVICE_URL=http://url-shortener-service:5000
REDIRECT_SERVICE_URL=http://redirect-service:3000
ANALYTICS_SERVICE_URL=http://analytics-service:3002
NOTIFICATION_SERVICE_URL=http://notification-service:3003
```

## Services URLs - Production
```
AUTH_SERVICE_URL=https://authservice-kkwn.onrender.com
URL_SHORTENER_SERVICE_URL=https://urlshortenerservice-407v.onrender.com
REDIRECT_SERVICE_URL=https://redirectservice-ayfr.onrender.com
ANALYTICS_SERVICE_URL=https://analyticsservice.onrender.com
NOTIFICATION_SERVICE_URL=https://notificationservice-83qo.onrender.com
```

## CORS Configuration
```
CORS_ORIGINS=http://localhost:3000,http://localhost:8080,https://url-shortener-app.onrender.com
```

## Rate Limiting
```
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

## Logging
```
LOG_LEVEL=info
LOG_FILE_PATH=./logs/api-gateway.log
```

## Cấu hình trên Render.com
Khi triển khai trên Render.com, cần cấu hình tất cả các biến môi trường trên trong phần Environment Variables của dịch vụ. 