// Import axios and socket.io-client
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { io, Socket } from 'socket.io-client';
import { API_GATEWAY } from './api-references';

// Create an axios instance
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://url-shortener-obve.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Socket.io instance for real-time updates
let socket: Socket | null = null;

// Function to initialize and get the socket
export const getSocket = (): Socket => {
  if (!socket) {
    socket = io('https://url-shortener-obve.onrender.com', {
      path: '/api/notifications/socket.io',
      autoConnect: false,
      withCredentials: true,
    });
  }
  return socket;
};

// Function to connect socket with authentication
export const connectSocket = (token: string): void => {
  const socket = getSocket();
  
  // Set auth token
  socket.auth = { token };
  
  // Connection event handlers for debugging
  socket.on('connect', () => {
    console.log('Socket connected successfully');
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
  
  // Connect if not already connected
  if (!socket.connected) {
    console.log('Attempting to connect socket with token:', token ? 'Token exists' : 'No token');
    socket.connect();
  }
};

// Function to disconnect socket
export const disconnectSocket = (): void => {
  if (socket && socket.connected) {
    console.log('Disconnecting socket');
    socket.disconnect();
  }
};

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
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
  
  updateProfile: async (data: {
    name?: string;
    email?: string;
    avatarUrl?: string;
  }) => {
    const response = await api.put('/api/users/me', data);
    
    // Update local storage user data
    if (response.data && response.data.user) {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          const updatedUser = { ...user, ...response.data.user };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (e) {
          console.error('Error updating user in localStorage:', e);
        }
      }
    }
    
    return response.data;
  },
  
  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const response = await api.put('/api/users/password', data);
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
  
  getTopUrls: async (limit = 5, userId?: string) => {
    const query = new URLSearchParams();
    query.append('sortBy', 'clicks');
    query.append('sortOrder', 'desc');
    query.append('limit', limit.toString());
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