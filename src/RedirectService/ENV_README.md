# Hướng dẫn cấu hình môi trường cho Redirect Service

## Giới thiệu
Redirect Service sử dụng các biến môi trường (environment variables) để cấu hình các thông số như kết nối database, Redis cache, cổng máy chủ, v.v.

## File .env
Tạo một file `.env` trong thư mục gốc của Redirect Service với nội dung sau:

```
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Connection (MongoDB Atlas)
MONGODB_URI=mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/redirect?retryWrites=true&w=majority&appName=Cluster1

# Redis Configuration
REDIS_URI=redis://localhost:6379
CACHE_EXPIRY_SECONDS=86400

# RabbitMQ Configuration
RABBITMQ_URI=amqp://localhost:5672
RABBITMQ_EXCHANGE=url-shortener-events
RABBITMQ_QUEUE_URL_CREATED=redirect-service-url-created

# Logging
LOG_LEVEL=info
```

## Chi tiết các biến môi trường

### Server Configuration
- **PORT**: Cổng mạng mà service lắng nghe (mặc định: 3000)
- **NODE_ENV**: Môi trường chạy ứng dụng (development, production, test)

### MongoDB Connection
- **MONGODB_URI**: URI kết nối đến MongoDB Atlas cluster
  - Format: `mongodb+srv://<username>:<password>@<cluster>/<database>?<options>`
  - Mặc định sử dụng database "redirect" trong cluster

### Redis Configuration
- **REDIS_URI**: URI kết nối đến Redis
- **CACHE_EXPIRY_SECONDS**: Thời gian hết hạn của cache (theo giây, mặc định: 86400 - 24 giờ)

### RabbitMQ Configuration
- **RABBITMQ_URI**: URI kết nối đến RabbitMQ
- **RABBITMQ_EXCHANGE**: Tên exchange sử dụng cho sự kiện
- **RABBITMQ_QUEUE_URL_CREATED**: Tên queue để nhận sự kiện UrlCreated

### Logging
- **LOG_LEVEL**: Mức độ chi tiết của log (error, warn, info, http, verbose, debug, silly)

## Sử dụng trong Docker

Khi chạy trong Docker, các biến môi trường được định nghĩa trong docker-compose.yml hoặc khi chạy lệnh docker run:

```yaml
environment:
  - PORT=3000
  - NODE_ENV=production
  - MONGODB_URI=mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/redirect?retryWrites=true&w=majority&appName=Cluster1
  - REDIS_URI=redis://redis:6379
  - RABBITMQ_URI=amqp://guest:guest@rabbitmq:5672
```

## Cấu hình trong code

Các biến môi trường được quản lý tập trung trong file `config/config.js` và có thể truy cập thông qua:

```javascript
const config = require('../config/config');

// Sử dụng
const port = config.server.port;
const redisUri = config.redis.uri;
const cacheExpiry = config.redis.cacheExpiry;
``` 