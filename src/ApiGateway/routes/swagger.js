const express = require('express');
const axios = require('axios');
const config = require('../config/config');
const logger = require('../services/logger');
const router = express.Router();

// Setup trang chủ Swagger với các liên kết đến các service
router.get('/', (req, res) => {
  const services = Object.entries(config.swagger.apis).map(([key, api]) => ({
    id: key,
    name: api.name,
    version: api.version,
    url: `/swagger/${key}`
  }));

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Gateway - Swagger Documentation</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <style>
      body { padding: 20px; }
      .card { margin-bottom: 20px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>API Gateway - Swagger Documentation</h1>
      <div class="row">
        ${services.map(service => `
          <div class="col-md-6 col-lg-4 mb-4">
            <div class="card">
              <div class="card-body">
                <h5 class="card-title">${service.name}</h5>
                <p class="card-text">Version: ${service.version}</p>
                <a href="${service.url}" class="btn btn-primary">View API Docs</a>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </body>
  </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Map của service với đường dẫn Swagger UI
// Tất cả service sử dụng /api-docs
const serviceSwaggerPaths = {
  'auth': '/api-docs',
  'notification': '/api-docs',
  'redirect': '/api-docs',
  'analytics': '/api-docs',
  'urlShorteners': '/api-docs' // Sửa từ /swagger thành /api-docs
};

// Chuyển hướng đến đường dẫn proxy của API Gateway
Object.entries(config.swagger.apis).forEach(([key, api]) => {
  router.get(`/${key}`, (req, res) => {
    // Lấy đường dẫn Swagger UI phù hợp
    const swaggerPath = serviceSwaggerPaths[key] || '/api-docs';
    
    // Sử dụng đường dẫn proxy đã được định nghĩa trong routes/proxy.js
    const proxyPath = `/${key}${swaggerPath}/`;
    
    logger.info(`Redirecting to Swagger UI for ${key}`, { 
      redirectUrl: proxyPath,
      requestId: req.id 
    });
    
    // Đối với URL Shortener, tạo HTML Swagger UI tùy chỉnh sử dụng swagger.json từ proxy
    if (key === 'urlShorteners') {
      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>URL Shortener API</title>
        <link rel="stylesheet" type="text/css" href="/urlShorteners/api-docs/swagger-ui.css" />
        <style>
          html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="/urlShorteners/api-docs/swagger-ui-bundle.js"></script>
        <script src="/urlShorteners/api-docs/swagger-ui-standalone-preset.js"></script>
        <script>
        window.onload = function() {
          // Sử dụng swagger.json đã được proxy
          const ui = SwaggerUIBundle({
            url: "/api/urlshortener/swagger.json",
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout"
          });
        };
        </script>
      </body>
      </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } else {
      res.redirect(proxyPath);
    }
  });
});

module.exports = router; 