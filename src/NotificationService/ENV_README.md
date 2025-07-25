# Hướng dẫn cấu hình môi trường cho Notification Service

## Giới thiệu
Notification Service sử dụng các biến môi trường (environment variables) để cấu hình các thông số như kết nối database, SMTP, cổng máy chủ, v.v.

## File .env
Tạo một file `.env` trong thư mục gốc của Notification Service với nội dung sau:

```
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Connection (MongoDB Atlas)
MONGODB_URI=mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/notification?retryWrites=true&w=majority&appName=Cluster1

# RabbitMQ Configuration
RABBITMQ_URI=amqp://localhost:5672
RABBITMQ_EXCHANGE=url-shortener-events
RABBITMQ_QUEUE_USER_CREATED=notification-service-user-created
RABBITMQ_QUEUE_URL_CREATED=notification-service-url-created

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=user@example.com
SMTP_PASS=yourpassword
EMAIL_FROM=URL Shortener <noreply@urlshortener.com>

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
  - Mặc định sử dụng database "notification" trong cluster

### RabbitMQ Configuration
- **RABBITMQ_URI**: URI kết nối đến RabbitMQ
- **RABBITMQ_EXCHANGE**: Tên exchange sử dụng cho sự kiện
- **RABBITMQ_QUEUE_USER_CREATED**: Tên queue để nhận sự kiện tạo người dùng mới
- **RABBITMQ_QUEUE_URL_CREATED**: Tên queue để nhận sự kiện tạo URL mới

### Email Configuration
- **SMTP_HOST**: Địa chỉ máy chủ SMTP
- **SMTP_PORT**: Cổng máy chủ SMTP (mặc định: 587)
- **SMTP_SECURE**: Sử dụng kết nối bảo mật (true/false)
- **SMTP_USER**: Tên đăng nhập SMTP
- **SMTP_PASS**: Mật khẩu SMTP
- **EMAIL_FROM**: Địa chỉ email gửi đi

### Logging
- **LOG_LEVEL**: Mức độ chi tiết của log (error, warn, info, http, verbose, debug, silly)

## Sử dụng trong Docker

Khi chạy trong Docker, các biến môi trường được định nghĩa trong docker-compose.yml hoặc khi chạy lệnh docker run:

```yaml
environment:
  - PORT=3000
  - NODE_ENV=production
  - MONGODB_URI=mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/notification?retryWrites=true&w=majority&appName=Cluster1
  - RABBITMQ_URI=amqp://guest:guest@rabbitmq:5672
  - SMTP_HOST=smtp.example.com
  - SMTP_PORT=587
  - SMTP_USER=user
  - SMTP_PASS=password
```

## Cấu hình trong code

Các biến môi trường được quản lý tập trung trong file `config/config.js` và có thể truy cập thông qua:

```javascript
const config = require('../config/config');

// Sử dụng
const port = config.server.port;
const smtpConfig = config.email.smtp;
const emailFrom = config.email.from;
``` 