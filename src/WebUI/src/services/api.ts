import axios from 'axios';
import { API_GATEWAY } from './api-references';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_GATEWAY.BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth data and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },
  
  register: async (name: string, email: string, password: string) => {
    const response = await api.post('/api/auth/register', { name, email, password });
    return response.data;
  },
  
  logout: async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { success: true };
  },
  
  validateToken: async (token: string) => {
    const response = await api.post('/api/auth/validate', { token });
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get('/api/users/me');
    return response.data;
  },
};

// URL API
export const urlAPI = {
  shorten: async (payload: {
    originalUrl: string;
    customAlias?: string;
    expiresAt?: string;
    metadata?: Record<string, any>;
  }) => {
    // Get the current user from localStorage
    const userJson = localStorage.getItem('user');
    let userId;
    
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        userId = user.id;
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
    
    const response = await api.post('/api/url-shortener', {
      ...payload,
      userId: userId // Include user ID in the request
    });
    return response.data;
  },
  
  getUrls: async (page = 1, limit = 10, active?: boolean, userId?: string) => {
    const query = new URLSearchParams();
    query.append('page', page.toString());
    query.append('limit', limit.toString());
    if (active !== undefined) query.append('active', active.toString());
    if (userId) query.append('userId', userId);
    
    const response = await api.get(`/api/urls?${query.toString()}`);
    return response.data;
  },
  
  getUrl: async (shortCode: string) => {
    const response = await api.get(`/api/urls/${shortCode}`);
    return response.data;
  },
  
  updateUrl: async (shortCode: string, data: {
    active?: boolean;
    expiresAt?: string;
    metadata?: Record<string, any>;
  }) => {
    const response = await api.put(`/api/urls/${shortCode}`, data);
    return response.data;
  },
  
  disableUrl: async (shortCode: string) => {
    const response = await api.post(`/api/urls/${shortCode}/disable`);
    return response.data;
  },
  
  refreshCache: async (shortCode: string) => {
    const response = await api.post(`/api/urls/${shortCode}/refresh-cache`);
    return response.data;
  },
  
  getUrlStats: async (shortCode: string) => {
    const response = await api.get(`/api/urls/${shortCode}/stats`);
    return response.data;
  }
};

// Analytics API
export const analyticsAPI = {
  getOverview: async (period: string = 'week') => {
    const response = await api.get(`/api/analytics/overview?period=${period}`);
    return response.data;
  },
  
  getUrlAnalytics: async (shortCode: string, period: string = 'month') => {
    const response = await api.get(`/api/analytics/urls/${shortCode}?period=${period}`);
    return response.data;
  },
  
  getClicksTimeseries: async (params: {
    shortCode?: string;
    period?: string;
    range?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.shortCode) query.append('shortCode', params.shortCode);
    if (params.period) query.append('period', params.period);
    if (params.range) query.append('range', params.range);
    
    const response = await api.get(`/api/analytics/clicks/timeseries?${query.toString()}`);
    return response.data;
  },
  
  getSummary: async () => {
    const response = await api.get('/api/analytics/summary');
    return response.data;
  },
  
  exportAnalytics: async (params: {
    shortCode?: string;
    startDate?: string;
    endDate?: string;
    format?: 'csv' | 'json' | 'xlsx';
  } = {}) => {
    const query = new URLSearchParams();
    if (params.shortCode) query.append('shortCode', params.shortCode);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.format) query.append('format', params.format);
    
    const response = await api.get(`/api/analytics/export?${query.toString()}`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

// Notifications API
export const notificationAPI = {
  getNotifications: async (page = 1, limit = 10, filters?: {
    read?: boolean;
    type?: string;
  }) => {
    const query = new URLSearchParams();
    query.append('page', page.toString());
    query.append('limit', limit.toString());
    if (filters?.read !== undefined) query.append('read', filters.read.toString());
    if (filters?.type) query.append('type', filters.type);
    
    const response = await api.get(`/api/notifications?${query.toString()}`);
    return response.data;
  },
  
  getUnreadCount: async () => {
    const response = await api.get('/api/notifications/unread-count');
    return response.data;
  },
  
  markAsRead: async (notificationId: string) => {
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  },
  
  markAllAsRead: async () => {
    const response = await api.put('/api/notifications/mark-all-read');
    return response.data;
  },
  
  getPreferences: async () => {
    const response = await api.get('/api/notifications/preferences');
    return response.data;
  },
  
  updatePreferences: async (preferences: {
    email?: boolean;
    push?: boolean;
    inApp?: boolean;
    emailFrequency?: string;
    notificationSettings?: Record<string, boolean>;
  }) => {
    const response = await api.put('/api/notifications/preferences', preferences);
    return response.data;
  }
};

export default api; 