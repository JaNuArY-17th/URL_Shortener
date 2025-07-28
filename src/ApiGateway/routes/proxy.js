const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../config/config');
const logger = require('../services/logger');
const authenticate = require('../middleware/authenticate');

// Helper để tạo proxy middleware với logging và error handling
const createProxyWithLogging = (target, pathRewrite = {}, requireAuth = false, isSwaggerUI = false) => {
  const middleware = [];
  
  // Thêm middleware xác thực nếu cần
  if (requireAuth) {
    middleware.push(authenticate);
  }
  
  // Tùy chọn proxy đặc biệt cho Swagger UI
  const options = {
    target,
    changeOrigin: true,
    pathRewrite,
    logLevel: 'silent', // Tắt logs mặc định của http-proxy-middleware
    onProxyReq: (proxyReq, req, res) => {
      // Ghi log khi gửi proxy request
      logger.debug(`Proxying ${req.method} ${req.path} -> ${target}${req.path}`, {
        method: req.method,
        path: req.path,
        target,
        requestId: req.id
      });

      // ----- Re-stream body nếu đã được express.json() parse -----
      if (req.body && Object.keys(req.body).length && req.headers['content-type']?.includes('application/json')) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // Xử lý CSP headers cho Swagger UI
      if (isSwaggerUI) {
        // Xóa các CSP headers từ response gốc
        proxyRes.headers['content-security-policy'] = undefined;
        proxyRes.headers['content-security-policy-report-only'] = undefined;
        
        // Thêm CSP header cho phép inline scripts cho Swagger UI
        res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net");
      }
      
      // Ghi log khi nhận proxy response
      const statusCode = proxyRes.statusCode;
      if (statusCode >= 400) {
        logger.warn(`Proxy response: ${statusCode} for ${req.method} ${req.path}`, {
          statusCode,
          method: req.method,
          path: req.path,
          target,
          requestId: req.id
        });
      } else {
        logger.debug(`Proxy response: ${statusCode} for ${req.method} ${req.path}`, {
          statusCode,
          method: req.method,
          path: req.path,
          target,
          requestId: req.id
        });
      }
    },
    onError: (err, req, res) => {
      // Ghi log khi có lỗi trong quá trình proxy
      logger.error(`Proxy error for ${req.method} ${req.path}`, {
        error: err.message,
        method: req.method,
        path: req.path,
        target,
        requestId: req.id
      });
      
      // Trả về lỗi
      res.status(502).json({
        status: 'error',
        message: 'Bad Gateway',
        error: err.message,
        requestId: req.id
      });
    }
  };
  
  // Thêm proxy middleware
  middleware.push(createProxyMiddleware(options));
  
  return middleware;
};

// Cấu hình các routes proxy
const setupProxyRoutes = (app) => {
  // Auth Service Routes
  app.use('/api/auth', ...createProxyWithLogging(
    config.services.auth
  ));
  
  app.use('/api/users', ...createProxyWithLogging(
    config.services.auth,
    undefined,
    true // Yêu cầu xác thực
  ));
  
  // URL Shortener Service Routes
  app.use('/api/Urls', ...createProxyWithLogging(
    config.services.urlShorteners,
  ));
  
  // Redirect Service - URL Management Routes
  app.use('/api/urls', ...createProxyWithLogging(
    config.services.redirect,
    (path) => '/api/urls' + path,
    true // Yêu cầu xác thực
  ));
  
  // Redirect Service - Redirect Route
  app.use('/:shortCode([a-zA-Z0-9]{6,10})', ...createProxyWithLogging(
    config.services.redirect,
    {} // Không thay đổi path
  ));
  
  // Analytics Service Routes
  app.use('/api/analytics', ...createProxyWithLogging(
    config.services.analytics,
    (path) => '/api/analytics' + path,
    true // Yêu cầu xác thực
  ));
  
  // Notification Service Routes
  app.use('/api/notifications', ...createProxyWithLogging(
    config.services.notification,
    (path) => '/api/notifications' + path,
    true // Yêu cầu xác thực
  ));
  
  // API Docs routes
  app.use('/auth/api-docs', ...createProxyWithLogging(
    config.services.auth,
    { '^/auth/api-docs': '/api-docs' },
    false, // Không yêu cầu xác thực
    true   // Đây là Swagger UI
  ));
  
  app.use('/redirect/api-docs', ...createProxyWithLogging(
    config.services.redirect,
    { '^/redirect/api-docs': '/api-docs' },
    false,
    true
  ));
  
  app.use('/analytics/api-docs', ...createProxyWithLogging(
    config.services.analytics,
    { '^/analytics/api-docs': '/api-docs' },
    false,
    true
  ));
  
  app.use('/notification/api-docs', ...createProxyWithLogging(
    config.services.notification,
    { '^/notification/api-docs': '/api-docs' },
    false,
    true
  ));

  // Proxy cho UrlShortenerService sử dụng /api-docs
  app.use('/urlShorteners/api-docs', ...createProxyWithLogging(
    config.services.urlShorteners,
    { '^/urlShorteners/api-docs': '/api-docs' },
    false,
    true
  ));

  // Proxy cho index.html cụ thể
  app.use('/urlShorteners/api-docs/index.html', ...createProxyWithLogging(
    config.services.urlShorteners,
    { '^/urlShorteners/api-docs/index.html': '/api-docs/index.html' },
    false,
    true
  ));

  // Đảm bảo tài nguyên tĩnh cũng được proxy
  app.use('/urlShorteners/api-docs/swagger-ui.css', ...createProxyWithLogging(
    config.services.urlShorteners,
    { '^/urlShorteners/api-docs/swagger-ui.css': '/api-docs/swagger-ui.css' },
    false,
    true
  ));

  app.use('/urlShorteners/api-docs/swagger-ui-bundle.js', ...createProxyWithLogging(
    config.services.urlShorteners,
    { '^/urlShorteners/api-docs/swagger-ui-bundle.js': '/api-docs/swagger-ui-bundle.js' },
    false,
    true
  ));

  app.use('/urlShorteners/api-docs/swagger-ui-standalone-preset.js', ...createProxyWithLogging(
    config.services.urlShorteners,
    { '^/urlShorteners/api-docs/swagger-ui-standalone-preset.js': '/api-docs/swagger-ui-standalone-preset.js' },
    false,
    true
  ));

  // Proxy tất cả các tài nguyên trong thư mục api-docs
  app.use('/urlShorteners/api-docs/', ...createProxyWithLogging(
    config.services.urlShorteners,
    { '^/urlShorteners/api-docs/': '/api-docs/' },
    false,
    true
  ));

  // Thêm route mới: Proxy trực tiếp cho swagger.json
  app.use('/api/urlshortener/swagger.json', ...createProxyWithLogging(
    config.services.urlShorteners,
    { '^/api/urlshortener/swagger.json': '/swagger/v1/swagger.json' },
    false,
    false  // Không phải Swagger UI, chỉ là file JSON
  ));
};

module.exports = setupProxyRoutes; 