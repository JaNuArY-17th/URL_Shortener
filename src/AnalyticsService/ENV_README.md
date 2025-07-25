# Hướng dẫn cấu hình môi trường cho Analytics Service

## Giới thiệu
Analytics Service sử dụng các biến môi trường (environment variables) để cấu hình các thông số như kết nối database, cổng máy chủ, xử lý dữ liệu thống kê, v.v.

## File .env
Tạo một file `.env` trong thư mục gốc của Analytics Service với nội dung sau:

```
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Connection (MongoDB Atlas)
MONGODB_URI=mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/analytics?retryWrites=true&w=majority&appName=Cluster1

# RabbitMQ Configuration
RABBITMQ_URI=amqp://localhost:5672
RABBITMQ_EXCHANGE=url-shortener-events
RABBITMQ_QUEUE_REDIRECT_EVENTS=analytics-service-redirect-events

# API Configuration
DEFAULT_LIMIT=20
MAX_LIMIT=100

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
  - Mặc định sử dụng database "analytics" trong cluster

### RabbitMQ Configuration
- **RABBITMQ_URI**: URI kết nối đến RabbitMQ
- **RABBITMQ_EXCHANGE**: Tên exchange sử dụng cho sự kiện
- **RABBITMQ_QUEUE_REDIRECT_EVENTS**: Tên queue để nhận sự kiện redirect

### API Configuration
- **DEFAULT_LIMIT**: Số lượng kết quả mặc định trả về cho mỗi trang (mặc định: 20)
- **MAX_LIMIT**: Số lượng kết quả tối đa cho mỗi trang (mặc định: 100)

### Logging
- **LOG_LEVEL**: Mức độ chi tiết của log (error, warn, info, http, verbose, debug, silly)

## Sử dụng trong Docker

Khi chạy trong Docker, các biến môi trường được định nghĩa trong docker-compose.yml hoặc khi chạy lệnh docker run:

```yaml
environment:
  - PORT=3000
  - NODE_ENV=production
  - MONGODB_URI=mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/analytics?retryWrites=true&w=majority&appName=Cluster1
  - RABBITMQ_URI=amqp://guest:guest@rabbitmq:5672
  - DEFAULT_LIMIT=20
  - MAX_LIMIT=100
```

## Cấu hình trong code

Các biến môi trường được quản lý tập trung trong file `config/config.js` và có thể truy cập thông qua:

```javascript
const config = require('../config/config');

// Sử dụng
const port = config.server.port;
const defaultLimit = config.api.defaultLimit;
const rabbitMqUri = config.rabbitmq.uri;
``` 