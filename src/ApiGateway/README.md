# API Gateway

API Gateway của hệ thống URL Shortener, triển khai bằng Node.js và Express. Đây là điểm vào chính của hệ thống, xử lý routing, bảo mật, và tích hợp Swagger UI cho tất cả các microservices.

## Công nghệ sử dụng
- **Node.js** và **Express**
- **http-proxy-middleware** cho reverse proxy
- **swagger-ui-express** cho API documentation
- **jsonwebtoken** cho xác thực
- **helmet** cho bảo mật
- **winston** cho logging
- **express-rate-limit** cho giới hạn tần suất request

## Cấu trúc thư mục
```
/
├── config/             # Cấu hình ứng dụng
│   └── config.js       # Cấu hình tập trung, kết nối services
├── middleware/         # Middlewares
│   ├── authenticate.js # Xác thực JWT
│   ├── error-handler.js# Xử lý lỗi
│   └── request-id.js   # Thêm request ID vào mỗi request
├── routes/             # Định nghĩa routes
│   ├── health.js       # Health check endpoints
│   ├── proxy.js        # Cấu hình proxy đến các services
│   └── swagger.js      # Swagger UI endpoints
├── services/           # Services
│   └── logger.js       # Logger service
├── .env                # Biến môi trường
├── ENV_README.md       # Hướng dẫn cấu hình môi trường
├── Dockerfile          # Docker configuration
├── package.json        # Dependencíes
└── server.js           # Entry point
```

## Tính năng chính
1. **Reverse Proxy**: Chuyển tiếp requests đến các microservices tương ứng
2. **Xác thực tập trung**: Xác thực JWT token và chuyển tiếp thông tin người dùng
3. **Swagger UI tích hợp**: Tập hợp API docs từ tất cả các microservices
4. **Rate Limiting**: Giới hạn tần suất request
5. **Health Checks**: API kiểm tra trạng thái của tất cả các services
6. **Request Tracking**: Mỗi request có một ID duy nhất để theo dõi qua logs

## Cấu hình các routes

### Health Check
- `GET /api/health`: Health check cơ bản
- `GET /api/health/deep`: Kiểm tra trạng thái của tất cả các services

### Swagger UI
- `GET /swagger`: Trang chủ Swagger với danh sách tất cả các services
- `GET /swagger/{serviceName}`: Swagger UI cho service cụ thể
- `GET /swagger/{serviceName}/json`: Swagger JSON cho service cụ thể

### API Routes
- `POST /api/auth/register`: Đăng ký người dùng (AuthService)
- `POST /api/auth/login`: Đăng nhập (AuthService)
- `GET /api/users/me`: Thông tin người dùng (AuthService)
- `POST /api/urls/create`: Tạo URL rút gọn (UrlShortenerService)
- `GET /api/urls`: Quản lý URLs (RedirectService)
- `GET /api/analytics/*`: Thống kê và phân tích (AnalyticsService)
- `GET /api/notifications/*`: Thông báo (NotificationService)
- `GET /{shortCode}`: Chuyển hướng URL (RedirectService)

## Chạy ứng dụng

### Cài đặt dependencies
```bash
npm install
```

### Chạy ở chế độ development
```bash
npm run dev
```

### Chạy ở chế độ production
```bash
npm start
```

### Chạy với Docker
```bash
docker build -t api-gateway .
docker run -p 5000:5000 -d api-gateway
```

### Cấu hình môi trường
Xem file `ENV_README.md` để biết chi tiết về cấu hình môi trường. 