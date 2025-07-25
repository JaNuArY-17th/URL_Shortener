# Hướng dẫn cấu hình môi trường cho Auth Service

## Giới thiệu
Auth Service sử dụng các biến môi trường (environment variables) để cấu hình các thông số như kết nối database, cổng máy chủ, bảo mật, v.v.

## File .env
Tạo một file `.env` trong thư mục gốc của Auth Service với nội dung sau:

```
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Connection (MongoDB Atlas)
MONGODB_URI=mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/auth?retryWrites=true&w=majority&appName=Cluster1

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=24h

# RabbitMQ Connection
RABBITMQ_URI=amqp://localhost:5672

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
  - Mặc định sử dụng database "auth" trong cluster

### JWT Configuration
- **JWT_SECRET**: Khóa bí mật để ký và xác thực JWT tokens
- **JWT_EXPIRES_IN**: Thời gian hết hạn của JWT token (mặc định: 24h)

### RabbitMQ Connection
- **RABBITMQ_URI**: URI kết nối đến RabbitMQ

### Logging
- **LOG_LEVEL**: Mức độ chi tiết của log (error, warn, info, http, verbose, debug, silly)

## Sử dụng trong Docker

Khi chạy trong Docker, các biến môi trường được định nghĩa trong docker-compose.yml hoặc khi chạy lệnh docker run:

```yaml
environment:
  - PORT=3000
  - NODE_ENV=production
  - MONGODB_URI=mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/auth?retryWrites=true&w=majority&appName=Cluster1
  - JWT_SECRET=your_jwt_secret
  - RABBITMQ_URI=amqp://guest:guest@rabbitmq:5672
```

## Cấu hình trong code

Các biến môi trường được quản lý tập trung trong file `config/config.js` và có thể truy cập thông qua:

```javascript
const config = require('../config/config');

// Sử dụng
const port = config.server.port;
const mongoUri = config.db.mongodb.uri;
``` 