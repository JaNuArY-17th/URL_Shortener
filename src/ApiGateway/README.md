# ApiGateway

Đây là entrypoint của hệ thống, sử dụng Ocelot để định tuyến, bảo mật và tổng hợp các request từ client đến các microservice phía sau. Chịu trách nhiệm xác thực, phân quyền, logging, rate limiting, CORS, v.v.

## Công nghệ
- **ASP.NET Core**
- **Ocelot** cho API gateway
- **JWT Authentication** cho xác thực token từ IdentityService (Node.js)

## Cấu trúc thư mục
```
/
├── Configuration/         # Cấu hình Ocelot
├── Middleware/            # Custom middleware
├── ocelot.json            # Ocelot routing configuration
├── ocelot.{env}.json      # Environment-specific configuration
├── appsettings.json       # Application settings
└── Program.cs             # Application entry point
```

## Routing Configuration

Ocelot được cấu hình để định tuyến đến các service:

1. **IdentityService (Node.js)** - `/api/auth/*`, `/api/users/*`
2. **UrlShortenerService (ASP.NET Core)** - `/api/urls/*`
3. **RedirectService (Node.js)** - `/{shortCode}`
4. **AnalyticsService (Node.js)** - `/api/analytics/*`
5. **NotificationService (Node.js)** - `/api/notifications/*`

## Authentication

API Gateway xác thực JWT tokens được phát hành bởi IdentityService (Node.js) và chuyển tiếp thông tin người dùng đến các microservices thông qua headers. 