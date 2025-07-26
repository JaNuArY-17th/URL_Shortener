# UrlShortenerService

Dịch vụ chuyên biệt cho việc tạo mã rút gọn (shortcode) cho URL. Service này chỉ tập trung vào logic sinh mã ngắn duy nhất và phát sự kiện UrlCreatedEvent khi có URL mới được tạo. Việc lưu trữ và chuyển hướng URL sẽ được thực hiện bởi RedirectService.

## Công nghệ
- **ASP.NET Core**
- **RabbitMQ** cho message broker

## Cấu trúc thư mục
```
/
├── Controllers/      # API controllers
│   └── UrlController.cs      # Xử lý API tạo shortcode
├── Models/           # Domain models
│   ├── UrlCreationRequest.cs # Request model cho API tạo URL
│   └── UrlCreationResponse.cs # Response model cho API tạo URL
├── Services/         # Business logic
│   ├── IShortCodeGeneratorService.cs  # Interface cho dịch vụ tạo mã ngắn
│   ├── ShortCodeGeneratorService.cs   # Triển khai thuật toán tạo mã ngắn
│   └── RateLimitingService.cs         # Dịch vụ giới hạn tốc độ tạo URL
├── Events/           # Event definitions và publishers
│   ├── UrlCreatedEvent.cs            # Định nghĩa cấu trúc event
│   ├── IEventPublisher.cs            # Interface cho event publisher
│   └── RabbitMQEventPublisher.cs     # Triển khai RabbitMQ publisher
├── Helpers/          # Utility functions
│   ├── StringUtils.cs               # Các phương thức hỗ trợ xử lý chuỗi
│   └── UrlValidator.cs              # Kiểm tra tính hợp lệ của URL
├── appsettings.json  # Application settings
└── Program.cs        # Application entry point
```

## API Endpoints
- `POST /api/urls` - Tạo mã rút gọn cho URL gốc
  - Request: `{ "originalUrl": "https://example.com", "customAlias": "custom-code", "expiresAt": "2024-12-31" }`
  - Response: `{ "shortCode": "abc123", "originalUrl": "https://example.com", "shortUrl": "https://short.domain/abc123" }`

## Events
- **UrlCreatedEvent** - Được phát khi URL mới được tạo với các thông tin:
  - `shortCode`: Mã rút gọn đã tạo
  - `originalUrl`: URL gốc
  - `userId`: ID người dùng (nếu có)
  - `createdAt`: Thời điểm tạo
  - `expiresAt`: Thời điểm hết hạn (nếu có)
  - `metadata`: Dữ liệu bổ sung (tùy chọn)

## Luồng xử lý
1. UrlShortenerService nhận request tạo URL mới
2. Kiểm tra tính hợp lệ của URL gốc
3. Tạo mã ngắn (shortcode) duy nhất theo thuật toán
4. Phát sự kiện UrlCreatedEvent với thông tin shortCode và URL gốc
5. RedirectService sẽ xử lý sự kiện này để lưu trữ ánh xạ URL và xử lý chuyển hướng

## Cấu hình RabbitMQ
UrlShortenerService kết nối với RabbitMQ để phát sự kiện UrlCreatedEvent:
- Exchange: "url-shortener-events" (topic)
- Routing Key: "url.created"
- Queue (ở RedirectService): "redirect-service.url-created" 