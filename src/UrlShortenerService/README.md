# UrlShortenerService

Dịch vụ cốt lõi tạo và quản lý URL rút gọn. Sinh mã ngắn duy nhất, lưu trữ ánh xạ short code <-> original URL, phát sự kiện UrlCreatedEvent.

## Công nghệ
- **ASP.NET Core**
- **Entity Framework Core** cho truy cập dữ liệu
- **SQL Server/PostgreSQL** cho lưu trữ dữ liệu
- **RabbitMQ** cho message broker

## Cấu trúc thư mục
```
/
├── Controllers/      # API controllers
├── Data/             # DbContext và migrations
├── Models/           # Domain models
├── Services/         # Business logic
├── Events/           # Event definitions và publishers
├── Helpers/          # Utility functions
├── appsettings.json  # Application settings
└── Program.cs        # Application entry point
```

## API Endpoints
- `POST /api/urls` - Tạo short URL mới
- `GET /api/urls` - Lấy danh sách URL của người dùng
- `GET /api/urls/{id}` - Lấy chi tiết URL theo ID
- `DELETE /api/urls/{id}` - Xóa URL

## Events
- **UrlCreatedEvent** - Được phát khi URL mới được tạo 