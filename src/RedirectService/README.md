# RedirectService

Xử lý chuyển hướng từ short code sang original URL, sử dụng cache Redis để tăng tốc. Phát sự kiện RedirectOccurredEvent, consume UrlCreatedEvent để làm nóng cache.

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
- `GET /api/health` - Health check endpoint

## Events
- **Publish**: RedirectOccurredEvent - Được phát khi có request redirect
- **Consume**: UrlCreatedEvent - Nhận để cập nhật cache 