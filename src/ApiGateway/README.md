# ApiGateway

Đây là entrypoint của hệ thống, sử dụng Ocelot để định tuyến, bảo mật và tổng hợp các request từ client đến các microservice phía sau. Chịu trách nhiệm xác thực, phân quyền, logging, rate limiting, CORS, v.v.

## Công nghệ
- **ASP.NET Core**
- **Ocelot** cho API gateway
- **JWT Authentication** cho xác thực token từ AuthService (Node.js)
- **Swagger** cho API documentation

## Cấu trúc thư mục
```
ApiGateway/
├── .vs/                   # Visual Studio files
├── ApiGateway/            # Project folder
│   ├── Middleware/        # Custom middleware
│   │   ├── AuthenticationMiddleware.cs  # JWT token parsing
│   │   └── RequestIdMiddleware.cs       # Request ID generation
│   ├── ocelot.json        # Ocelot routing configuration
│   ├── ocelot.Development.json # Environment-specific configuration
│   ├── appsettings.json   # Application settings
│   ├── appsettings.Development.json # Development settings
│   ├── Program.cs         # Application entry point
│   ├── ApiGateway.csproj  # Project file
│   └── Dockerfile         # Docker build file
└── ApiGateway.sln         # Solution file
```

## Routing Configuration

Ocelot được cấu hình để định tuyến đến các service:

1. **AuthService (Node.js)** - `/api/auth/*`, `/api/users/*`
2. **UrlShortenerService (ASP.NET Core)** - `/api/urls/*`
3. **RedirectService (Node.js)** - `/{shortCode}`
4. **AnalyticsService (Node.js)** - `/api/analytics/*`
5. **NotificationService (Node.js)** - `/api/notifications/*`

## Authentication

API Gateway xác thực JWT tokens được phát hành bởi AuthService (Node.js) và chuyển tiếp thông tin người dùng đến các microservices thông qua headers.

## Chạy ứng dụng

```bash
cd src/ApiGateway/ApiGateway
dotnet restore
dotnet run
```

API Gateway sẽ chạy mặc định tại https://localhost:5001

## Swagger UI

Truy cập Swagger UI tại https://localhost:5001/swagger để xem các API từ tất cả các service.

## Docker

Build và chạy container:

```bash
cd src/ApiGateway/ApiGateway
docker build -t url-shortener/api-gateway .
docker run -p 5001:80 url-shortener/api-gateway
``` 