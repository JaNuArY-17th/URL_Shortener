# IdentityService

Quản lý người dùng, xác thực (login/register), phân quyền (roles, JWT). Cung cấp API cho đăng ký, đăng nhập, quản lý tài khoản, phát hành JWT, phát sự kiện UserCreatedEvent.

## Công nghệ
- **Node.js** và **Express**
- **MongoDB** cho lưu trữ dữ liệu người dùng
- **Passport.js** cho xác thực
- **JWT** cho authorization tokens
- **RabbitMQ** cho giao tiếp với các service khác

## Cấu trúc thư mục
```
/
├── config/          # Cấu hình ứng dụng
├── controllers/     # Xử lý logic request/response
├── middleware/      # JWT validation, error handling
├── models/          # User model schema
├── routes/          # API endpoints
├── services/        # Business logic
├── utils/           # Helper functions
├── .env             # Environment variables
├── server.js        # Application entry point
└── package.json     # Dependencies
```

## API Endpoints
- `POST /api/auth/register` - Đăng ký người dùng mới
- `POST /api/auth/login` - Đăng nhập và lấy JWT
- `GET /api/users/me` - Lấy thông tin người dùng hiện tại
- `PUT /api/users/me` - Cập nhật thông tin người dùng

## Events
- **UserCreatedEvent** - Được phát khi người dùng mới đăng ký 