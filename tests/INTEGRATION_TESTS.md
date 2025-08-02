# Integration Tests cho URL Shortener

File này mô tả các integration test trong dự án URL Shortener, cách triển khai và cách chạy chúng.

## Giới thiệu

Integration testing (kiểm thử tích hợp) là quá trình kiểm tra xem các module hoặc service khác nhau trong hệ thống có hoạt động đúng khi được kết hợp lại với nhau không. Trong kiến trúc microservice của URL Shortener, việc kiểm thử tích hợp đặc biệt quan trọng để đảm bảo:

1. Các service giao tiếp chính xác qua RabbitMQ
2. Sự kiện được xử lý đúng cách giữa các service
3. Các API endpoints hoạt động đúng khi được gọi từ service khác
4. Redis caching hoạt động chính xác
5. Thông tin được lưu trữ và truy xuất đúng từ MongoDB

## Cấu trúc của Integration Tests

Các integration test được tổ chức trong thư mục con tương ứng với service mà chúng kiểm tra:

```
tests/
├── AnalyticsService.Tests/
├── RedirectService.Tests/
│   └── integration.test.js      # Integration tests cho RedirectService và AnalyticsService
├── UrlShortenerService.Tests/
│   └── Integration.cs           # Integration tests cho UrlShortenerService và RedirectService
├── IdentityService.Tests/
│   └── integration.test.js      # Integration tests cho AuthService và NotificationService
└── INTEGRATION_TESTS.md         # File này
```

## Các test chính và luồng kiểm thử

### 1. RedirectService và AnalyticsService Integration

**File:** `tests/RedirectService.Tests/integration.test.js`

Kiểm tra luồng redirect URL và thu thập analytics:
- Khi người dùng truy cập short URL
- RedirectService chuyển hướng người dùng đến URL gốc
- RedirectService gửi sự kiện `RedirectOccurredEvent` qua RabbitMQ
- AnalyticsService nhận sự kiện và cập nhật dữ liệu thống kê

### 2. UrlShortenerService và RedirectService Integration

**File:** `tests/UrlShortenerService.Tests/Integration.cs`

Kiểm tra luồng tạo URL và lưu trữ:
- Khi người dùng tạo short URL mới
- UrlShortenerService tạo mã ngắn
- UrlShortenerService gửi sự kiện `UrlCreatedEvent` qua RabbitMQ
- RedirectService nhận sự kiện và lưu URL để sử dụng cho việc chuyển hướng

### 3. AuthService và NotificationService Integration

**File:** `tests/IdentityService.Tests/integration.test.js`

Kiểm tra luồng xác thực và thông báo:
- Khi người dùng đăng ký, đăng nhập hoặc reset mật khẩu
- AuthService xử lý yêu cầu và phát các sự kiện như `UserCreatedEvent` hoặc `PasswordResetEvent`
- NotificationService nhận các sự kiện và gửi thông báo qua email hoặc giao diện

## Cài đặt và Cấu hình

Các integration test sử dụng các dịch vụ thực tế hoặc dịch vụ mô phỏng:

1. **MongoDB**: Sử dụng cơ sở dữ liệu đặc biệt cho testing (`test_integration`)
2. **RabbitMQ**: Kết nối đến RabbitMQ được cấu hình trong biến môi trường
3. **Redis**: Kết nối đến Redis instance được cấu hình trong biến môi trường

## Cách chạy Integration Tests

### Điều kiện tiên quyết

Trước khi chạy integration tests, đảm bảo có:

1. MongoDB đang chạy và có thể truy cập
2. RabbitMQ đang chạy và có thể truy cập
3. Redis đang chạy và có thể truy cập

### Các biến môi trường

Cấu hình các biến môi trường sau hoặc sử dụng file `.env`:

```
MONGODB_URI=mongodb+srv://username:password@hostname/test_integration
RABBITMQ_URI=amqp://user:password@hostname:5672
REDIS_URI=redis://hostname:6379
JWT_SECRET=test_jwt_secret
```

### Chạy tests với Node.js (Jest)

```bash
cd tests/RedirectService.Tests
npm test integration.test.js

cd tests/IdentityService.Tests
npm test integration.test.js
```

### Chạy tests với .NET

```bash
cd tests/UrlShortenerService.Tests
dotnet test --filter "Category=Integration"
```

## Quy tắc cho Integration Tests

Khi viết integration tests, hãy tuân thủ các nguyên tắc sau:

1. **Độc lập**: Mỗi test nên tự xử lý tạo dữ liệu test và dọn dẹp sau khi chạy
2. **Cô lập**: Sử dụng các kỹ thuật như UUID ngẫu nhiên để đảm bảo dữ liệu test không bị xung đột
3. **Đúng mục đích**: Kiểm tra các tương tác giữa các service, không phải logic nội bộ của từng service
4. **Chờ đợi hợp lý**: Sử dụng các kỹ thuật chờ đợi phù hợp cho các tác vụ bất đồng bộ (sử dụng timeouts phù hợp)
5. **Dọn dẹp triệt để**: Luôn xóa dữ liệu test sau khi hoàn thành

## Xử lý Lỗi Phổ biến

1. **Connection failures**: Kiểm tra kết nối đến các dịch vụ (MongoDB, RabbitMQ, Redis)
2. **Timeout errors**: Tăng thời gian chờ cho các sự kiện bất đồng bộ
3. **Missing events**: Kiểm tra cấu hình exchange và queue trong RabbitMQ
4. **Data inconsistency**: Kiểm tra trạng thái ban đầu của cơ sở dữ liệu và Redis 