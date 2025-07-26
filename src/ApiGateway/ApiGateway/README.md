# API Gateway

API Gateway là điểm vào chính cho hệ thống URL Shortener Microservices. Được xây dựng bằng ASP.NET Core và sử dụng thư viện Ocelot để thực hiện các chức năng của một API Gateway.

## Tính năng

- Định tuyến yêu cầu đến các microservice phù hợp
- Xác thực JWT và chuyển tiếp thông tin người dùng
- Theo dõi request thông qua Request ID
- Tích hợp Swagger để hiển thị API từ tất cả các service
- Hỗ trợ CORS
- Cấu hình môi trường linh hoạt

## Các microservice được định tuyến

1. **Auth Service** - `/api/auth/*`, `/api/users/*`
2. **URL Shortener Service** - `/api/urls/*` 
3. **Redirect Service** - `/{shortCode}`
4. **Analytics Service** - `/api/analytics/*`
5. **Notification Service** - `/api/notifications/*`

## Cấu hình

Các file cấu hình chính:
- `ocelot.json` - Cấu hình chính cho Ocelot
- `ocelot.{Environment}.json` - Cấu hình riêng cho từng môi trường
- `appsettings.json` - Cấu hình ứng dụng và JWT

## Middleware

- `AuthenticationMiddleware` - Xác thực JWT và chuyển tiếp thông tin người dùng
- `RequestIdMiddleware` - Tạo và theo dõi request ID

## Chạy ứng dụng

```bash
dotnet run
```

API Gateway sẽ chạy mặc định tại https://localhost:5001

## Docker

Build Docker image:

```bash
docker build -t url-shortener/api-gateway .
```

Chạy container:

```bash
docker run -p 5001:80 url-shortener/api-gateway
``` 