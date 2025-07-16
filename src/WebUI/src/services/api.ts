import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
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
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  register: async (name: string, email: string, password: string) => {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
};

// URL API
export const urlAPI = {
  shorten: async (originalUrl: string) => {
    const response = await api.post('/urls/shorten', { originalUrl });
    return response.data;
  },
  
  getUrls: async () => {
    const response = await api.get('/urls');
    return response.data;
  },
  
  getUrl: async (id: string) => {
    const response = await api.get(`/urls/${id}`);
    return response.data;
  },
  
  deleteUrl: async (id: string) => {
    const response = await api.delete(`/urls/${id}`);
    return response.data;
  },
  
  getAnalytics: async (id: string) => {
    const response = await api.get(`/urls/${id}/analytics`);
    return response.data;
  },
};

// Analytics API
export const analyticsAPI = {
  getDashboardStats: async () => {
    const response = await api.get('/analytics/dashboard');
    return response.data;
  },
  
  getUrlStats: async (urlId: string, period: string = '7d') => {
    const response = await api.get(`/analytics/urls/${urlId}?period=${period}`);
    return response.data;
  },
  
  getClickHistory: async (urlId: string) => {
    const response = await api.get(`/analytics/urls/${urlId}/clicks`);
    return response.data;
  },
};

export default api; 