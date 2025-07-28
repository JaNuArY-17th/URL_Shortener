# URL Shortener API Documentation

## Giới thiệu

Hệ thống URL Shortener được xây dựng theo kiến trúc microservices, gồm các service sau:

1. **AuthService** - Xác thực và quản lý người dùng
2. **UrlShortenerService** - Tạo mã URL rút gọn
3. **RedirectService** - Chuyển hướng và quản lý URL
4. **AnalyticsService** - Phân tích và thống kê
5. **NotificationService** - Quản lý thông báo
6. **ApiGateway** - Điểm truy cập tập trung

## Các endpoint chính

### API Gateway

API Gateway là điểm truy cập được khuyến nghị cho tất cả các API. Gateway sẽ định tuyến yêu cầu đến các service phù hợp.

**Base URL:** `https://url-shortener-obve.onrender.com`

### Xác thực (AuthService)

#### Đăng ký
```
POST /api/auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

#### Đăng nhập
```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

#### Xác thực token
```
POST /api/auth/validate
```

**Request Body:**
```json
{
  "token": "jwt_token"
}
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

#### Lấy thông tin người dùng hiện tại
```
GET /api/users/me
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
  "id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "createdAt": "2023-01-01T00:00:00.000Z"
}
```

#### Cập nhật thông tin người dùng
```
PUT /api/users/me
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com"
}
```

#### Đổi mật khẩu
```
PUT /api/users/password
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword123!"
}
```

### Tạo URL (UrlShortenerService)

#### Tạo URL rút gọn
```
POST /api/urls
```

**Headers:**
```
Authorization: Bearer jwt_token (optional)
```

**Request Body:**
```json
{
  "originalUrl": "https://example.com/very-long-url-that-needs-shortening",
  "customAlias": "mycode", // optional
  "expiresAt": "2024-12-31T23:59:59Z", // optional
  "userId": "user_id" // optional, detected from token if authenticated
}
```

**Response:**
```json
{
  "shortCode": "mycode",
  "originalUrl": "https://example.com/very-long-url-that-needs-shortening",
  "shortUrl": "https://short.domain/mycode",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "expiresAt": "2024-12-31T23:59:59Z",
  "userId": "user_id"
}
```

### Quản lý URL (RedirectService)

#### Lấy danh sách URL
```
GET /api/urls
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Query Parameters:**
- `page`: Số trang (mặc định: 1)
- `limit`: Số lượng URL mỗi trang (mặc định: 10)
- `active`: Lọc theo trạng thái kích hoạt (true/false)

**Response:**
```json
{
  "data": [
    {
      "shortCode": "abc123",
      "originalUrl": "https://example.com/url-1",
      "active": true,
      "clicks": 42,
      "uniqueVisitors": 30,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "lastAccessedAt": "2023-01-02T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

#### Lấy thông tin URL theo mã
```
GET /api/urls/{shortCode}
```

**Response:**
```json
{
  "data": {
    "shortCode": "abc123",
    "originalUrl": "https://example.com/url-1",
    "active": true,
    "clicks": 42,
    "uniqueVisitors": 30,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "lastAccessedAt": "2023-01-02T00:00:00.000Z",
    "expiresAt": null,
    "metadata": {}
  },
  "cache": {
    "hit": true,
    "exists": true
  }
}
```

#### Cập nhật URL
```
PUT /api/urls/{shortCode}
```

**Request Body:**
```json
{
  "active": true,
  "expiresAt": "2024-12-31T23:59:59Z",
  "metadata": {
    "title": "My URL",
    "description": "Description for my URL",
    "tags": ["important", "work"]
  }
}
```

#### Vô hiệu hóa URL
```
POST /api/urls/{shortCode}/disable
```

#### Lấy thống kê URL
```
GET /api/urls/{shortCode}/stats
```

**Response:**
```json
{
  "data": {
    "shortCode": "abc123",
    "originalUrl": "https://example.com/url-1",
    "clicks": 42,
    "uniqueVisitors": 30,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "lastAccessedAt": "2023-01-02T00:00:00.000Z",
    "cache": {
      "exists": true,
      "ttl": 3600
    }
  }
}
```

### Phân tích (AnalyticsService)

#### Tổng quan phân tích
```
GET /api/analytics/overview
```

**Query Parameters:**
- `period`: Khoảng thời gian (day, week, month, year, all) (mặc định: week)

**Response:**
```json
{
  "period": "week",
  "summary": {
    "totalClicks": 1470,
    "uniqueVisitors": 890,
    "topUrls": [
      {
        "shortCode": "abc123",
        "originalUrl": "https://example.com/url-1",
        "clicks": 420,
        "uniqueVisitors": 300
      }
    ]
  },
  "clicksByCountry": [
    {
      "country": "US",
      "count": 450
    }
  ],
  "clicksByDevice": [
    {
      "device": "desktop",
      "count": 650
    }
  ],
  "clicksOverTime": [
    {
      "date": "2023-01-01",
      "clicks": 120
    }
  ]
}
```

#### Phân tích chi tiết cho URL
```
GET /api/analytics/urls/{shortCode}
```

**Query Parameters:**
- `period`: Khoảng thời gian (day, week, month, year, all) (mặc định: month)

**Response:**
```json
{
  "shortCode": "abc123",
  "originalUrl": "https://example.com/url-1",
  "userId": "user_id",
  "totalClicks": 420,
  "uniqueVisitors": 300,
  "lastClickAt": "2023-01-02T00:00:00.000Z",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "countryStats": {
    "US": 200,
    "UK": 100,
    "CA": 50,
    "other": 70
  },
  "deviceStats": {
    "desktop": 250,
    "mobile": 150,
    "tablet": 20
  },
  "hourlyClicks": [
    {
      "hour": 12,
      "count": 60
    }
  ],
  "dailyClicks": [
    {
      "day": 1,
      "dayName": "Monday",
      "count": 120
    }
  ],
  "timeSeries": [
    {
      "date": "2023-01-01",
      "clicks": 120,
      "uniqueVisitors": 90
    }
  ],
  "recentClicks": [
    {
      "timestamp": "2023-01-02T12:34:56.789Z",
      "country": "US",
      "device": "desktop",
      "referer": "google.com"
    }
  ]
}
```

#### Dữ liệu thống kê theo thời gian
```
GET /api/analytics/clicks/timeseries
```

**Query Parameters:**
- `shortCode`: Mã URL (không bắt buộc, nếu không có sẽ lấy tất cả)
- `period`: Đơn vị thời gian (hour, day, week, month) (mặc định: day)
- `range`: Khoảng thời gian (day, week, month, year) (mặc định: week)

#### Xuất dữ liệu
```
GET /api/analytics/export
```

**Query Parameters:**
- `shortCode`: Mã URL (không bắt buộc, nếu không có sẽ lấy tất cả)
- `start`: Thời gian bắt đầu (ISO format)
- `end`: Thời gian kết thúc (ISO format)
- `format`: Định dạng xuất (csv, json) (mặc định: csv)

#### Tóm tắt thống kê
```
GET /api/analytics/summary
```

**Response:**
```json
{
  "totalClicks": 1470,
  "clicksToday": 120,
  "clicksYesterday": 110,
  "clicksLast7Days": 820,
  "clicksLast30Days": 1470,
  "uniqueVisitorsToday": 90,
  "activeUrls": 5,
  "clicksGrowthRate": {
    "daily": 9.09
  },
  "timestamp": "2023-01-02T00:00:00.000Z"
}
```

### Thông báo (NotificationService)

#### Lấy danh sách thông báo
```
GET /api/notifications
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Query Parameters:**
- `page`: Số trang (mặc định: 1)
- `limit`: Số lượng thông báo mỗi trang (mặc định: 10)
- `read`: Lọc theo trạng thái đã đọc (true/false)
- `type`: Lọc theo loại thông báo (info, success, warning, error, url, system)

#### Lấy số lượng thông báo chưa đọc
```
GET /api/notifications/unread-count
```

#### Đánh dấu thông báo đã đọc
```
PUT /api/notifications/{notificationId}/read
```

#### Đánh dấu tất cả thông báo đã đọc
```
PUT /api/notifications/mark-all-read
```

#### Lấy thiết lập thông báo
```
GET /api/notifications/preferences
```

#### Cập nhật thiết lập thông báo
```
PUT /api/notifications/preferences
```

**Request Body:**
```json
{
  "email": true,
  "push": true,
  "inApp": true,
  "emailFrequency": "daily",
  "notificationSettings": {
    "urlClicks": true,
    "system": true
  }
}
```

## Mã lỗi

| Mã lỗi | Mô tả |
| ------ | ----- |
| 400 | Bad Request - Dữ liệu không hợp lệ |
| 401 | Unauthorized - Cần xác thực |
| 403 | Forbidden - Không có quyền truy cập |
| 404 | Not Found - Tài nguyên không tồn tại |
| 409 | Conflict - Xung đột (ví dụ: shortCode đã tồn tại) |
| 429 | Too Many Requests - Quá nhiều yêu cầu |
| 500 | Internal Server Error - Lỗi máy chủ |

## Hướng dẫn tích hợp

### Sử dụng với JavaScript/TypeScript

```javascript
// Sử dụng API Gateway (khuyến nghị)
const API_URL = 'https://url-shortener-obve.onrender.com';

// Đăng nhập
async function login(email, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Đăng nhập thất bại');
  }
  
  // Lưu token
  localStorage.setItem('token', data.token);
  return data;
}

// Tạo URL rút gọn
async function createShortUrl(originalUrl, customAlias = '') {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/api/urls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify({ 
      originalUrl,
      customAlias
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Tạo URL rút gọn thất bại');
  }
  
  return data;
}

// Lấy thống kê URL
async function getUrlAnalytics(shortCode) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/api/analytics/urls/${shortCode}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Lấy thông tin thống kê thất bại');
  }
  
  return data;
}
```

## Kết luận

API hệ thống URL Shortener cung cấp đầy đủ các chức năng cần thiết để tạo, quản lý và phân tích URL rút gọn. Sử dụng API Gateway là cách tiếp cận được khuyến nghị để tương tác với hệ thống.

Để biết thêm chi tiết, vui lòng tham khảo các endpoint và mô tả Swagger của từng service. 