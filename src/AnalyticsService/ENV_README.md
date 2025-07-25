# Hướng dẫn cấu hình môi trường cho Analytics Service

## Giới thiệu
Analytics Service sử dụng các biến môi trường (environment variables) để cấu hình các thông số như kết nối database, cổng máy chủ, xử lý sự kiện từ RabbitMQ, và các cấu hình khác.

## File .env
Tạo một file `.env` trong thư mục gốc của Analytics Service với nội dung sau:

```
# Server Configuration
PORT=3002
NODE_ENV=development

# MongoDB Connection (MongoDB Atlas)
MONGODB_URI=mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/analytics?retryWrites=true&w=majority&appName=Cluster1

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

# Analytics Features
ENABLE_CACHING=true
DETAILED_ANALYTICS=true
DATA_RETENTION_DAYS=365

# API Configuration
MAX_RESULTS_PER_PAGE=100
```

## Chi tiết các biến môi trường

### Server Configuration
- **PORT**: Cổng mạng mà service lắng nghe (mặc định: 3002)
- **NODE_ENV**: Môi trường chạy ứng dụng (development, production, test)

### MongoDB Connection
- **MONGODB_URI**: URI kết nối đến MongoDB Atlas cluster
  - Format: `mongodb+srv://<username>:<password>@<cluster>/<database>?<options>`
  - Mặc định sử dụng database "analytics" trong cluster

### RabbitMQ Connection
- **RABBITMQ_URI**: URI kết nối đến RabbitMQ
  - Sử dụng để nhận sự kiện redirect URL từ RedirectService

### CORS Configuration
- **CORS_ORIGINS**: Danh sách các domain được phép truy cập API, phân cách bởi dấu phẩy

### Rate Limiting
- **API_RATE_LIMIT_MAX**: Số lượng yêu cầu tối đa trong một khoảng thời gian (mặc định: 100)
- **API_RATE_LIMIT_WINDOW_MS**: Khoảng thời gian cho rate limiting, tính bằng milliseconds (mặc định: 15 phút)

### Logging
- **LOG_LEVEL**: Mức độ ghi log (error, warn, info, debug)
- **LOG_DIRECTORY**: Thư mục lưu trữ file log (mặc định: logs)

### Analytics Features
- **ENABLE_CACHING**: Cho phép sử dụng cache cho các truy vấn phân tích thường xuyên (true/false)
- **DETAILED_ANALYTICS**: Bật/tắt phân tích chi tiết như thiết bị, quốc gia, v.v. (true/false)
- **DATA_RETENTION_DAYS**: Số ngày lưu giữ dữ liệu click events trước khi tự động xóa (mặc định: 365)

### API Configuration
- **MAX_RESULTS_PER_PAGE**: Số lượng kết quả tối đa trả về trên mỗi trang khi phân trang

## Hướng dẫn sử dụng Docker

Khi sử dụng Docker, các biến môi trường có thể được cấu hình trong docker-compose.yml:

```yaml
analytics-service:
  build:
    context: ./src/AnalyticsService
  environment:
    - PORT=3002
    - NODE_ENV=production
    - MONGODB_URI=mongodb+srv://nhl170100:dHaPiWdbYDuKSnxF@cluster1.zayctcf.mongodb.net/analytics?retryWrites=true&w=majority&appName=Cluster1
    - RABBITMQ_URI=amqp://rabbitmq:5672
    - CORS_ORIGINS=https://your-domain.com
    - API_RATE_LIMIT_MAX=100
    - API_RATE_LIMIT_WINDOW_MS=900000
    - LOG_LEVEL=info
    - DETAILED_ANALYTICS=true
  ports:
    - "3002:3002"
  depends_on:
    - rabbitmq
```

## Hướng dẫn cấu hình cho Render

Khi triển khai trên Render, cấu hình các biến môi trường sau trong phần "Environment Variables":

### Biến môi trường tối thiểu (bắt buộc)
- **NODE_ENV**: production
- **PORT**: 3002 (Render sẽ tự động đặt giá trị này)
- **MONGODB_URI**: URI kết nối MongoDB Atlas
- **RABBITMQ_URI**: URI kết nối RabbitMQ (nếu sử dụng dịch vụ RabbitMQ bên ngoài)
- **CORS_ORIGINS**: Danh sách các domain được phép truy cập, bao gồm domain của Render
- **JWT_SECRET**: Khóa bí mật cho JWT (phải giống với các service khác)

### Biến môi trường bổ sung (tùy chọn)
- **API_RATE_LIMIT_MAX**: 200 (nên tăng giới hạn khi chạy production)
- **DATA_RETENTION_DAYS**: 365
- **LOG_LEVEL**: info 