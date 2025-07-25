# Hướng dẫn cấu hình môi trường cho Notification Service

## Giới thiệu
Notification Service sử dụng các biến môi trường (environment variables) để cấu hình các thông số như kết nối database, cổng máy chủ, email, Socket.IO và các cấu hình khác.

## File .env
Tạo một file `.env` trong thư mục gốc của Notification Service với nội dung sau:

```
# Server Configuration
PORT=3003
NODE_ENV=development

# MongoDB Connection (MongoDB Atlas)
MONGODB_URI=mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/notification?retryWrites=true&w=majority&appName=Cluster1

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=24h

# RabbitMQ Connection
RABBITMQ_URI=amqp://localhost:5672

# CORS Configuration
CORS_ORIGINS=http://localhost:8080,http://localhost:3000

# Rate Limiting
API_RATE_LIMIT_MAX=100
API_RATE_LIMIT_WINDOW_MS=900000

# Logging
LOG_LEVEL=info
LOG_DIRECTORY=logs

# Email Configuration
EMAIL_ENABLED=false
EMAIL_FROM=noreply@urlshortener.example.com
EMAIL_SERVICE=smtp
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=
EMAIL_PASS=

# Socket.IO Configuration
SOCKET_IO_ENABLED=true
SOCKET_IO_ORIGIN=http://localhost:8080,http://localhost:3000

# Notification Settings
NOTIFICATION_RETENTION_DAYS=30
DEFAULT_EMAIL_NOTIFICATIONS=false
DEFAULT_PUSH_NOTIFICATIONS=false
NOTIFICATION_BATCH_SIZE=50
```

## Chi tiết các biến môi trường

### Server Configuration
- **PORT**: Cổng mạng mà service lắng nghe (mặc định: 3003)
- **NODE_ENV**: Môi trường chạy ứng dụng (development, production, test)

### MongoDB Connection
- **MONGODB_URI**: URI kết nối đến MongoDB Atlas cluster
  - Format: `mongodb+srv://<username>:<password>@<cluster>/<database>?<options>`
  - Mặc định sử dụng database "notification" trong cluster

### JWT Configuration
- **JWT_SECRET**: Khóa bí mật để ký và xác thực JWT tokens
- **JWT_EXPIRES_IN**: Thời gian hết hạn của JWT token (mặc định: 24h)

### RabbitMQ Connection
- **RABBITMQ_URI**: URI kết nối đến RabbitMQ
  - Sử dụng để nhận sự kiện từ các service khác

### CORS Configuration
- **CORS_ORIGINS**: Danh sách các domain được phép truy cập API, phân cách bởi dấu phẩy

### Rate Limiting
- **API_RATE_LIMIT_MAX**: Số lượng yêu cầu tối đa trong một khoảng thời gian (mặc định: 100)
- **API_RATE_LIMIT_WINDOW_MS**: Khoảng thời gian cho rate limiting, tính bằng milliseconds (mặc định: 15 phút)

### Logging
- **LOG_LEVEL**: Mức độ ghi log (error, warn, info, debug)
- **LOG_DIRECTORY**: Thư mục lưu trữ file log (mặc định: logs)

### Email Configuration
- **EMAIL_ENABLED**: Bật/tắt chức năng gửi email (true/false)
- **EMAIL_FROM**: Địa chỉ email gửi thông báo
- **EMAIL_SERVICE**: Dịch vụ email (smtp, gmail, sendgrid, ...)
- **EMAIL_HOST**: Máy chủ SMTP (chỉ cần khi EMAIL_SERVICE=smtp)
- **EMAIL_PORT**: Cổng kết nối SMTP (mặc định: 587)
- **EMAIL_SECURE**: Sử dụng kết nối bảo mật SSL/TLS (true/false)
- **EMAIL_USER**: Tên đăng nhập email
- **EMAIL_PASS**: Mật khẩu hoặc API key

### Socket.IO Configuration
- **SOCKET_IO_ENABLED**: Bật/tắt chức năng Socket.IO cho thông báo real-time (true/false)
- **SOCKET_IO_ORIGIN**: Danh sách các domain được phép kết nối Socket.IO, phân cách bởi dấu phẩy

### Notification Settings
- **NOTIFICATION_RETENTION_DAYS**: Số ngày lưu giữ thông báo trước khi tự động xóa (mặc định: 30)
- **DEFAULT_EMAIL_NOTIFICATIONS**: Cấu hình mặc định cho thông báo qua email (true/false)
- **DEFAULT_PUSH_NOTIFICATIONS**: Cấu hình mặc định cho thông báo push (true/false)
- **NOTIFICATION_BATCH_SIZE**: Số lượng thông báo xử lý trong một lần gửi email batch (mặc định: 50)

## Hướng dẫn sử dụng Docker

Khi sử dụng Docker, các biến môi trường có thể được cấu hình trong docker-compose.yml:

```yaml
notification-service:
  build:
    context: ./src/NotificationService
  environment:
    - PORT=3003
    - NODE_ENV=production
    - MONGODB_URI=mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/notification?retryWrites=true&w=majority&appName=Cluster1
    - JWT_SECRET=your_jwt_secret_key_change_in_production
    - RABBITMQ_URI=amqp://rabbitmq:5672
    - CORS_ORIGINS=https://your-domain.com
    - EMAIL_ENABLED=true
    - EMAIL_FROM=noreply@urlshortener.example.com
    - EMAIL_SERVICE=smtp
    - EMAIL_HOST=smtp.example.com
    - EMAIL_PORT=587
    - EMAIL_SECURE=false
    - EMAIL_USER=your_email_user
    - EMAIL_PASS=your_email_password
    - SOCKET_IO_ENABLED=true
    - SOCKET_IO_ORIGIN=https://your-domain.com
  ports:
    - "3003:3003"
  depends_on:
    - rabbitmq
```

## Hướng dẫn cấu hình cho Render

Khi triển khai trên Render, cấu hình các biến môi trường sau trong phần "Environment Variables":

### Biến môi trường tối thiểu (bắt buộc)
- **NODE_ENV**: production
- **PORT**: 3003 (Render sẽ tự động đặt giá trị này)
- **MONGODB_URI**: URI kết nối MongoDB Atlas
- **JWT_SECRET**: Khóa bí mật cho JWT (phải giống với các service khác)
- **RABBITMQ_URI**: URI kết nối RabbitMQ (nếu sử dụng dịch vụ RabbitMQ bên ngoài)
- **CORS_ORIGINS**: Danh sách các domain được phép truy cập, bao gồm domain của Render

### Biến môi trường bổ sung (tùy chọn)
- **API_RATE_LIMIT_MAX**: 200 (nên tăng giới hạn khi chạy production)
- **EMAIL_ENABLED**: true (nếu muốn bật chức năng gửi email)
- **EMAIL_FROM**, **EMAIL_SERVICE**, **EMAIL_USER**, **EMAIL_PASS**: Thông tin email để gửi thông báo
- **SOCKET_IO_ENABLED**: true (nếu muốn bật chức năng thông báo real-time)
- **SOCKET_IO_ORIGIN**: Danh sách các domain được phép kết nối Socket.IO
- **LOG_LEVEL**: info 