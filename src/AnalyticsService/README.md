# AnalyticsService

Thu thập, lưu trữ và cung cấp thống kê lượt click cho các URL rút gọn. Consume RedirectOccurredEvent từ RabbitMQ, cung cấp API analytics.

## Công nghệ
- **Node.js** và **Express**
- **MongoDB** cho lưu trữ dữ liệu click và thống kê URL
- **RabbitMQ** cho giao tiếp với các service khác
- **Redis** cho caching (tuỳ chọn)

## Cấu trúc thư mục
```
/
├── config/          # Cấu hình ứng dụng
├── middleware/      # Xác thực, error handling
├── models/          # ClickEvent và UrlStat schemas
├── routes/          # API endpoints
├── services/        # Logger và message handler
├── logs/            # Application logs
├── server.js        # Application entry point
├── swagger.js       # API documentation
└── package.json     # Dependencies
```

## API Endpoints
- `GET /api/analytics/overview` - Tổng quan thống kê cho user
- `GET /api/analytics/summary` - Tóm tắt nhanh các chỉ số phân tích
- `GET /api/analytics/urls/{shortCode}` - Chi tiết phân tích cho URL cụ thể
- `GET /api/analytics/clicks/timeseries` - Dữ liệu timeseries về clicks
- `GET /api/analytics/export` - Xuất dữ liệu phân tích (CSV, JSON, Excel)
- `GET /api/health` - Health check endpoint
- `GET /api/health/deep` - Kiểm tra kết nối đến các dependencies
- `GET /api/health/stats` - Thống kê runtime của service

## Mô hình dữ liệu
### ClickEvent
- Lưu thông tin chi tiết mỗi lần click (shortCode, timestamp, userAgent, etc.)
- Hỗ trợ phân tích theo quốc gia, thiết bị, trình duyệt
- Tự động xóa dữ liệu cũ theo cấu hình lưu trữ

### UrlStat
- Lưu thống kê tổng hợp cho mỗi URL (tổng clicks, visitors độc đáo)
- Dữ liệu thống kê theo quốc gia, thiết bị, nguồn giới thiệu
- Time series data cho biểu đồ và phân tích xu hướng

## Events
- **Consume**: RedirectOccurredEvent - Được nhận khi có người dùng click vào URL rút gọn
- **Process**: Cập nhật thống kê, lưu thông tin click, tính toán số liệu

## Các tính năng chính
- Theo dõi và phân tích click theo thời gian thực
- Phân tích theo địa lý, thiết bị, nguồn giới thiệu
- Xuất báo cáo dữ liệu
- API thống kê có thể lọc theo nhiều tiêu chí
- Hỗ trợ multiple data retention policies 