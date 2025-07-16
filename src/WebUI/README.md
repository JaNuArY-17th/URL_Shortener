# WebUI

Frontend React cho URL Shortener Microservices Project. Sử dụng Vite, TypeScript, Tailwind CSS, và shadcn/ui components.

## Features

- **URL Shortening**: Giao diện đẹp để rút gọn URL
- **Real-time Analytics**: Hiển thị thống kê click theo thời gian thực
- **Responsive Design**: Tương thích với mọi thiết bị
- **Modern UI**: Sử dụng shadcn/ui components và Tailwind CSS
- **TypeScript**: Type-safe development

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router DOM
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Structure

- `src/components/` - Reusable UI components
- `src/pages/` - Page components
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions
- `public/` - Static assets

## Integration

WebUI sẽ kết nối với các microservices thông qua API Gateway:
- Identity Service: Authentication/Authorization
- Url Shortener Service: Tạo URL rút gọn
- Analytics Service: Thống kê và analytics
- Notification Service: Thông báo
