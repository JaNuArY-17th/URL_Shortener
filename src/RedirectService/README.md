# RedirectService

Xử lý chuyển hướng từ short code sang original URL, sử dụng cache Redis để tăng tốc. Phát sự kiện RedirectOccurredEvent, consume UrlCreatedEvent để lưu trữ và làm nóng cache. Service này cũng đảm nhận vai trò quản lý và lưu trữ URL được rút gọn.

## Công nghệ
- **Node.js** và **Express**
- **Redis** cho caching
- **MongoDB** cho lưu trữ dữ liệu URL
- **RabbitMQ** cho giao tiếp với các service khác

## Cấu trúc thư mục
```
/
├── config/          # Cấu hình ứng dụng và Redis
├── controllers/     # Xử lý logic redirect
├── middleware/      # Error handling
├── models/          # URL schema
├── routes/          # API endpoints
├── services/        # Cache và database interactions
├── utils/           # Helper functions
├── events/          # RabbitMQ event handlers
├── .env             # Environment variables
├── server.js        # Application entry point
└── package.json     # Dependencies
```

## API Endpoints
- `GET /{shortCode}` - Chuyển hướng từ short code sang URL gốc
- `GET /api/urls` - Lấy danh sách URL với phân trang
- `GET /api/urls/{shortCode}` - Lấy chi tiết URL theo shortCode
- `POST /api/urls` - Lưu URL mới từ UrlShortenerService
- `PUT /api/urls/{shortCode}` - Cập nhật thông tin URL
- `POST /api/urls/{shortCode}/disable` - Vô hiệu hóa URL
- `GET /api/urls/{shortCode}/stats` - Xem thống kê URL
- `POST /api/urls/{shortCode}/refresh-cache` - Làm mới cache cho URL
- `GET /api/health` - Health check endpoint

## Luồng xử lý URL mới
1. UrlShortenerService tạo shortcode và phát sự kiện UrlCreatedEvent
2. RedirectService nhận sự kiện, lưu thông tin URL vào MongoDB và cache
3. RedirectService cũng cung cấp API để lưu URL mới trực tiếp
4. Khi có request đến shortcode, RedirectService xử lý việc chuyển hướng

## Events
- **Publish**: RedirectOccurredEvent - Được phát khi có request redirect
- **Consume**: UrlCreatedEvent - Nhận để lưu URL mới và cập nhật cache 