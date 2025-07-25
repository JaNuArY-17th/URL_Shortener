# Hướng dẫn cấu hình môi trường cho Redirect Service

## Giới thiệu
Redirect Service sử dụng các biến môi trường (environment variables) để cấu hình các thông số kết nối database, cổng máy chủ, Redis cache, RabbitMQ và các tham số khác.

## File .env
Tạo một file `.env` trong thư mục gốc của Redirect Service với nội dung sau:

```
# Server Configuration
PORT=3000
NODE_ENV=development
TRUST_PROXY=false

# MongoDB Connection (MongoDB Atlas)
MONGODB_URI=mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/redirect?retryWrites=true&w=majority&appName=Cluster1

# Redis Configuration
REDIS_URI=redis://localhost:6379
REDIS_CACHE_EXPIRY=3600

# RabbitMQ Connection
RABBITMQ_URI=amqp://localhost:5672
RABBITMQ_EXCHANGE=url-shortener-events
RABBITMQ_QUEUE_URL_CREATED=redirect-service.url-created
RABBITMQ_QUEUE_REDIRECT_EVENTS=redirect-events

# CORS Configuration
CORS_ORIGINS=http://localhost:8080,http://localhost:3000,http://localhost:5000

# Rate Limiting
REDIRECT_RATE_LIMIT_MAX=60
REDIRECT_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX=100
API_RATE_LIMIT_WINDOW_MS=900000

# Logging
LOG_LEVEL=info
LOG_DIRECTORY=logs

# Metrics
CLICK_COOLDOWN=2000

# Security
BOT_PROTECTION=true
ADMIN_IPS=127.0.0.1,::1
API_KEYS=your_api_key_1,your_api_key_2

# Features
FEATURE_GEO_TARGETING=true
FEATURE_ANALYTICS=true
FEATURE_ADVANCED_METRICS=true
FEATURE_CUSTOM_SLUGS=true

# GeoIP
GEOIP_PROVIDER=mock
MAXMIND_DB_PATH=./geoip/GeoLite2-Country.mmdb
GEOIP_API_KEY=your_geoip_api_key
```

## Chi tiết các biến môi trường

### Server Configuration
- **PORT**: Cổng mạng mà service lắng nghe (mặc định: 3000)
- **NODE_ENV**: Môi trường chạy ứng dụng (development, production, test)
- **TRUST_PROXY**: Thiết lập để tin tưởng proxy headers như X-Forwarded-For (true/false)

### MongoDB Connection
- **MONGODB_URI**: URI kết nối đến MongoDB Atlas cluster
  - Format: `mongodb+srv://<username>:<password>@<cluster>/<database>?<options>`
  - Mặc định sử dụng database "redirect" trong cluster

### Redis Configuration
- **REDIS_URI**: URI kết nối đến Redis server
  - Format: `redis://host:port`
- **REDIS_CACHE_EXPIRY**: Thời gian hết hạn cache (giây)

### RabbitMQ Connection
- **RABBITMQ_URI**: URI kết nối đến RabbitMQ
- **RABBITMQ_EXCHANGE**: Tên exchange để trao đổi message
- **RABBITMQ_QUEUE_URL_CREATED**: Tên queue để nhận sự kiện URL được tạo mới
- **RABBITMQ_QUEUE_REDIRECT_EVENTS**: Tên queue để gửi sự kiện chuyển hướng

### CORS Configuration
- **CORS_ORIGINS**: Danh sách các domain được phép truy cập API, phân cách bởi dấu phẩy

### Rate Limiting
- **REDIRECT_RATE_LIMIT_MAX**: Số lượng request chuyển hướng tối đa trong một khoảng thời gian
- **REDIRECT_RATE_LIMIT_WINDOW_MS**: Khoảng thời gian cho rate limit chuyển hướng (ms)
- **API_RATE_LIMIT_MAX**: Số lượng request API tối đa trong một khoảng thời gian
- **API_RATE_LIMIT_WINDOW_MS**: Khoảng thời gian cho rate limit API (ms)

### Logging
- **LOG_LEVEL**: Mức độ chi tiết của log (error, warn, info, http, verbose, debug, silly)
- **LOG_DIRECTORY**: Thư mục lưu trữ log files

### Metrics
- **CLICK_COOLDOWN**: Thời gian tối thiểu giữa hai lần đếm click từ cùng một IP (ms)

### Security
- **BOT_PROTECTION**: Bật/tắt tính năng phát hiện và hạn chế bot (true/false)
- **ADMIN_IPS**: Danh sách các địa chỉ IP được phép truy cập vào các tính năng admin
- **API_KEYS**: Danh sách các API key hợp lệ để xác thực API calls

### Features
- **FEATURE_GEO_TARGETING**: Bật/tắt tính năng chuyển hướng dựa trên vị trí địa lý (true/false)
- **FEATURE_ANALYTICS**: Bật/tắt tính năng phân tích dữ liệu (true/false)
- **FEATURE_ADVANCED_METRICS**: Bật/tắt tính năng metrics nâng cao (true/false)
- **FEATURE_CUSTOM_SLUGS**: Bật/tắt tính năng cho phép tạo slug tùy chỉnh (true/false)

### GeoIP
- **GEOIP_PROVIDER**: Provider sử dụng để xác định vị trí địa lý (mock, maxmind, ipstack, etc.)
- **MAXMIND_DB_PATH**: Đường dẫn đến file database MaxMind GeoIP
- **GEOIP_API_KEY**: API key cho dịch vụ GeoIP (nếu sử dụng dịch vụ bên ngoài)

## Sử dụng trong Docker

Khi chạy trong Docker, các biến môi trường được định nghĩa trong docker-compose.yml hoặc khi chạy lệnh docker run:

```yaml
environment:
  - PORT=3000
  - NODE_ENV=production
  - MONGODB_URI=mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/redirect?retryWrites=true&w=majority&appName=Cluster1
  - REDIS_URI=redis://redis:6379
  - RABBITMQ_URI=amqp://guest:guest@rabbitmq:5672
  - CORS_ORIGINS=https://your-frontend.com
  - REDIRECT_RATE_LIMIT_MAX=60
  - FEATURE_GEO_TARGETING=true
  - TRUST_PROXY=true
```

## Cấu hình trong code

Các biến môi trường được quản lý tập trung trong file `config/config.js` và có thể truy cập thông qua:

```javascript
const config = require('../config/config');

// Sử dụng
const port = config.server.port;
const mongoUri = config.db.mongodb.uri;
const redisUri = config.redis.uri;
```

## Triển khai trên Render

Khi triển khai trên Render, cần đặt các biến môi trường trong phần "Environment" của dịch vụ:

1. **NODE_ENV**: production
2. **MONGODB_URI**: <URI Atlas Cluster>
3. **REDIS_URI**: <URI Redis Cloud hoặc Redis Enterprise>
4. **RABBITMQ_URI**: <URI CloudAMQP hoặc dịch vụ RabbitMQ khác>
5. **CORS_ORIGINS**: <Domain của frontend sau khi triển khai>
6. **TRUST_PROXY**: true (thường cần thiết khi chạy sau proxy như Render)

### Biến môi trường tối thiểu cần thiết cho Render

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/redirect?retryWrites=true&w=majority&appName=Cluster1
REDIS_URI=redis://your-redis-host:port
RABBITMQ_URI=amqp://your-rabbitmq-user:your-rabbitmq-password@your-rabbitmq-host:port
CORS_ORIGINS=https://your-frontend.domain
TRUST_PROXY=true
```

### Biến môi trường bổ sung cho Production

Trong môi trường production, bạn nên cấu hình thêm các biến sau:

```
LOG_LEVEL=info
API_RATE_LIMIT_MAX=50
REDIRECT_RATE_LIMIT_MAX=30
BOT_PROTECTION=true
FEATURE_GEO_TARGETING=true
FEATURE_ANALYTICS=true
``` 