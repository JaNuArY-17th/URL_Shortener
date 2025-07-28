/**
 * API REFERENCES
 * Tổng hợp tất cả API từ các service trong hệ thống URL Shortener
 */

// Base URL for each service
const SERVICES = {
  AUTH_SERVICE: 'https://authservice-kkwn.onrender.com',
  NOTIFICATION_SERVICE: 'https://notificationservice-83qo.onrender.com',
  ANALYTICS_SERVICE: 'https://analyticsservice.onrender.com',
  REDIRECT_SERVICE: 'https://redirectservice-ayfr.onrender.com',
  URL_SHORTENER_SERVICE: 'https://urlshortenerservice-407v.onrender.com',
  API_GATEWAY: 'https://url-shortener-obve.onrender.com', // Preferred entry point
};

// Common headers for all requests
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

/**
 * AUTH SERVICE ENDPOINTS
 * Quản lý xác thực và người dùng
 */
export const AUTH_API = {
  // Authentication endpoints
  REGISTER: `${SERVICES.AUTH_SERVICE}/api/auth/register`,
  LOGIN: `${SERVICES.AUTH_SERVICE}/api/auth/login`,
  VALIDATE_TOKEN: `${SERVICES.AUTH_SERVICE}/api/auth/validate`,

  // User endpoints
  GET_CURRENT_USER: `${SERVICES.AUTH_SERVICE}/api/users/me`,
  UPDATE_PROFILE: `${SERVICES.AUTH_SERVICE}/api/users/me`,
  CHANGE_PASSWORD: `${SERVICES.AUTH_SERVICE}/api/users/password`,

  // Admin-only endpoints
  GET_ALL_USERS: `${SERVICES.AUTH_SERVICE}/api/users`,
  GET_USER_BY_ID: (userId) => `${SERVICES.AUTH_SERVICE}/api/users/${userId}`,

  // Health check
  HEALTH: `${SERVICES.AUTH_SERVICE}/api/health`,
};

/**
 * URL SHORTENER SERVICE ENDPOINTS
 * Tạo URL rút gọn
 */
export const URL_SHORTENER_API = {
  // URL creation
  CREATE_SHORT_URL: `${SERVICES.URL_SHORTENER_SERVICE}/api/urls`,

  // Health check
  HEALTH: `${SERVICES.URL_SHORTENER_SERVICE}/api/urls/health`,
};

/**
 * REDIRECT SERVICE ENDPOINTS
 * Quản lý và chuyển hướng URL
 */
export const REDIRECT_API = {
  // Redirect (không gọi trực tiếp từ client)
  REDIRECT: (shortCode) => `${SERVICES.REDIRECT_SERVICE}/${shortCode}`,

  // URL Management
  GET_URLS: `${SERVICES.REDIRECT_SERVICE}/api/urls`,
  GET_URL_BY_CODE: (shortCode) => `${SERVICES.REDIRECT_SERVICE}/api/urls/${shortCode}`,
  UPDATE_URL: (shortCode) => `${SERVICES.REDIRECT_SERVICE}/api/urls/${shortCode}`,
  DISABLE_URL: (shortCode) => `${SERVICES.REDIRECT_SERVICE}/api/urls/${shortCode}/disable`,
  GET_URL_STATS: (shortCode) => `${SERVICES.REDIRECT_SERVICE}/api/urls/${shortCode}/stats`,
  REFRESH_CACHE: (shortCode) => `${SERVICES.REDIRECT_SERVICE}/api/urls/${shortCode}/refresh-cache`,

  // Health check
  HEALTH: `${SERVICES.REDIRECT_SERVICE}/api/health`,
};

/**
 * ANALYTICS SERVICE ENDPOINTS
 * Theo dõi và phân tích
 */
export const ANALYTICS_API = {
  // Overview analytics
  GET_OVERVIEW: `${SERVICES.ANALYTICS_SERVICE}/api/analytics/overview`,
  
  // URL-specific analytics
  GET_URL_ANALYTICS: (shortCode) => `${SERVICES.ANALYTICS_SERVICE}/api/analytics/urls/${shortCode}`,
  
  // Time series data
  GET_CLICKS_TIMESERIES: `${SERVICES.ANALYTICS_SERVICE}/api/analytics/clicks/timeseries`,
  
  // Data export
  EXPORT_ANALYTICS: `${SERVICES.ANALYTICS_SERVICE}/api/analytics/export`,
  
  // Quick summary stats
  GET_SUMMARY: `${SERVICES.ANALYTICS_SERVICE}/api/analytics/summary`,

  // Health check
  HEALTH: `${SERVICES.ANALYTICS_SERVICE}/api/health`,
};

/**
 * NOTIFICATION SERVICE ENDPOINTS
 * Quản lý thông báo
 */
export const NOTIFICATION_API = {
  // Notifications
  GET_NOTIFICATIONS: `${SERVICES.NOTIFICATION_SERVICE}/api/notifications`,
  GET_UNREAD_COUNT: `${SERVICES.NOTIFICATION_SERVICE}/api/notifications/unread-count`,
  GET_NOTIFICATION: (notificationId) => `${SERVICES.NOTIFICATION_SERVICE}/api/notifications/${notificationId}`,
  MARK_AS_READ: (notificationId) => `${SERVICES.NOTIFICATION_SERVICE}/api/notifications/${notificationId}/read`,
  MARK_ALL_AS_READ: `${SERVICES.NOTIFICATION_SERVICE}/api/notifications/mark-all-read`,
  DELETE_NOTIFICATION: (notificationId) => `${SERVICES.NOTIFICATION_SERVICE}/api/notifications/${notificationId}`,
  
  // Notification preferences
  GET_PREFERENCES: `${SERVICES.NOTIFICATION_SERVICE}/api/notifications/preferences`,
  UPDATE_PREFERENCES: `${SERVICES.NOTIFICATION_SERVICE}/api/notifications/preferences`,
  
  // Device tokens for push notifications
  REGISTER_DEVICE_TOKEN: `${SERVICES.NOTIFICATION_SERVICE}/api/notifications/device-token`,
  REMOVE_DEVICE_TOKEN: `${SERVICES.NOTIFICATION_SERVICE}/api/notifications/device-token`,

  // Health check
  HEALTH: `${SERVICES.NOTIFICATION_SERVICE}/api/health`,
};

/**
 * API GATEWAY ENDPOINTS
 * Entry point cho tất cả các API (khuyến nghị sử dụng)
 * 
 * API Gateway định tuyến đến các service phù hợp. Các endpoint có cấu trúc giống
 * với các endpoint trực tiếp từ các service, nhưng có base URL khác.
 */
export const API_GATEWAY = {
  // Base URL
  BASE_URL: SERVICES.API_GATEWAY,

  // Auth Service
  AUTH: {
    REGISTER: `${SERVICES.API_GATEWAY}/api/auth/register`,
    LOGIN: `${SERVICES.API_GATEWAY}/api/auth/login`,
    VALIDATE_TOKEN: `${SERVICES.API_GATEWAY}/api/auth/validate`,
    GET_CURRENT_USER: `${SERVICES.API_GATEWAY}/api/users/me`,
    UPDATE_PROFILE: `${SERVICES.API_GATEWAY}/api/users/me`,
    CHANGE_PASSWORD: `${SERVICES.API_GATEWAY}/api/users/password`,
  },

  // URL Shortener Service
  URL_SHORTENER: {
    CREATE_SHORT_URL: `${SERVICES.API_GATEWAY}/api/urls`,
  },

  // Redirect Service
  REDIRECT: {
    GET_URLS: `${SERVICES.API_GATEWAY}/api/urls`,
    GET_URL_BY_CODE: (shortCode) => `${SERVICES.API_GATEWAY}/api/urls/${shortCode}`,
    UPDATE_URL: (shortCode) => `${SERVICES.API_GATEWAY}/api/urls/${shortCode}`,
    DISABLE_URL: (shortCode) => `${SERVICES.API_GATEWAY}/api/urls/${shortCode}/disable`,
    GET_URL_STATS: (shortCode) => `${SERVICES.API_GATEWAY}/api/urls/${shortCode}/stats`,
    REFRESH_CACHE: (shortCode) => `${SERVICES.API_GATEWAY}/api/urls/${shortCode}/refresh-cache`,
  },

  // Analytics Service
  ANALYTICS: {
    GET_OVERVIEW: `${SERVICES.API_GATEWAY}/api/analytics/overview`,
    GET_URL_ANALYTICS: (shortCode) => `${SERVICES.API_GATEWAY}/api/analytics/urls/${shortCode}`,
    GET_CLICKS_TIMESERIES: `${SERVICES.API_GATEWAY}/api/analytics/clicks/timeseries`,
    EXPORT_ANALYTICS: `${SERVICES.API_GATEWAY}/api/analytics/export`,
    GET_SUMMARY: `${SERVICES.API_GATEWAY}/api/analytics/summary`,
  },

  // Notification Service
  NOTIFICATIONS: {
    GET_NOTIFICATIONS: `${SERVICES.API_GATEWAY}/api/notifications`,
    GET_UNREAD_COUNT: `${SERVICES.API_GATEWAY}/api/notifications/unread-count`,
    GET_NOTIFICATION: (notificationId) => `${SERVICES.API_GATEWAY}/api/notifications/${notificationId}`,
    MARK_AS_READ: (notificationId) => `${SERVICES.API_GATEWAY}/api/notifications/${notificationId}/read`,
    MARK_ALL_AS_READ: `${SERVICES.API_GATEWAY}/api/notifications/mark-all-read`,
    DELETE_NOTIFICATION: (notificationId) => `${SERVICES.API_GATEWAY}/api/notifications/${notificationId}`,
    GET_PREFERENCES: `${SERVICES.API_GATEWAY}/api/notifications/preferences`,
    UPDATE_PREFERENCES: `${SERVICES.API_GATEWAY}/api/notifications/preferences`,
    REGISTER_DEVICE_TOKEN: `${SERVICES.API_GATEWAY}/api/notifications/device-token`,
    REMOVE_DEVICE_TOKEN: `${SERVICES.API_GATEWAY}/api/notifications/device-token`,
  },

  // Health checks
  HEALTH: {
    AUTH_SERVICE: `${SERVICES.API_GATEWAY}/api/health/auth`,
    URL_SHORTENER_SERVICE: `${SERVICES.API_GATEWAY}/api/health/urlshortener`,
    REDIRECT_SERVICE: `${SERVICES.API_GATEWAY}/api/health/redirect`,
    ANALYTICS_SERVICE: `${SERVICES.API_GATEWAY}/api/health/analytics`,
    NOTIFICATION_SERVICE: `${SERVICES.API_GATEWAY}/api/health/notifications`,
    GATEWAY: `${SERVICES.API_GATEWAY}/api/health`,
  },
};

/**
 * API METHOD DEFINITIONS
 * Example usage with fetch API
 */
export const API_METHODS = {
  // Cách sử dụng API với fetch
  example: {
    // Đăng nhập
    async login(email, password) {
      try {
        const response = await fetch(API_GATEWAY.AUTH.LOGIN, {
          method: 'POST',
          headers: DEFAULT_HEADERS,
          body: JSON.stringify({ email, password }),
        });
        return await response.json();
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },

    // Tạo URL rút gọn
    async createShortUrl(originalUrl, customAlias = '', userId = null) {
      try {
        const response = await fetch(API_GATEWAY.URL_SHORTENER.CREATE_SHORT_URL, {
          method: 'POST',
          headers: {
            ...DEFAULT_HEADERS,
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            originalUrl,
            customAlias,
            userId,
          }),
        });
        return await response.json();
      } catch (error) {
        console.error('Create short URL error:', error);
        throw error;
      }
    },
  }
};

export default {
  SERVICES,
  AUTH_API,
  URL_SHORTENER_API,
  REDIRECT_API,
  ANALYTICS_API,
  NOTIFICATION_API,
  API_GATEWAY,
  API_METHODS,
}; 