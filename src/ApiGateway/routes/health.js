const express = require('express');
const axios = require('axios');
const config = require('../config/config');
const logger = require('../services/logger');
const router = express.Router();

// Health check cơ bản
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Health check sâu (kiểm tra kết nối đến tất cả các services)
router.get('/deep', async (req, res, next) => {
  try {
    const serviceChecks = {};
    const servicePromises = [];
    
    // Tạo danh sách các promises kiểm tra health của từng service
    Object.entries(config.services).forEach(([key, url]) => {
      const checkPromise = axios.get(`${url}/api/health`, { timeout: 5000 })
        .then(() => {
          serviceChecks[key] = { status: 'ok' };
        })
        .catch(error => {
          logger.warn(`Health check failed for ${key}`, {
            error: error.message,
            requestId: req.id
          });
          serviceChecks[key] = {
            status: 'error',
            message: error.message
          };
        });
      
      servicePromises.push(checkPromise);
    });
    
    // Đợi tất cả các health checks hoàn thành
    await Promise.all(servicePromises);
    
    // Kiểm tra xem tất cả services có ok không
    const allServicesOk = Object.values(serviceChecks).every(check => check.status === 'ok');
    
    // Trả về kết quả
    res.status(allServicesOk ? 200 : 503).json({
      status: allServicesOk ? 'ok' : 'degraded',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      dependencies: serviceChecks
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 