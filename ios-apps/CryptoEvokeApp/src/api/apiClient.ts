import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base API URL - pointing to your live backend
const API_BASE_URL = 'https://evo-exchange.com/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-App-Platform': 'ios', // Identify requests from iOS app
  },
  withCredentials: true, // Important for cookie-based auth
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear authentication data
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      
      // Handle redirection to login in the app
      // This will be implemented in the auth context
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;

// Auth API endpoints
export const authApi = {
  login: async (username: string, password: string) => {
    const response = await apiClient.post('/auth/login', { username, password });
    return response.data;
  },
  
  register: async (userData: any) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },
  
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
  
  checkAuth: async () => {
    const response = await apiClient.get('/auth/session');
    return response.data;
  }
};

// User API endpoints
export const userApi = {
  getProfile: async () => {
    const response = await apiClient.get('/user/profile');
    return response.data;
  },
  
  updateProfile: async (profileData: any) => {
    const response = await apiClient.put('/user/profile', profileData);
    return response.data;
  }
};

// Admin API endpoints
export const adminApi = {
  getUsers: async () => {
    const response = await apiClient.get('/admin/users');
    return response.data;
  },
  
  verifyUser: async (userId: string) => {
    const response = await apiClient.post(`/admin/users/${userId}/verify`);
    return response.data;
  },
  
  getAnalytics: async () => {
    const response = await apiClient.get('/admin/analytics');
    return response.data;
  },
  
  getEmployees: async () => {
    const response = await apiClient.get('/admin/employees');
    return response.data;
  }
};

// Contractor API endpoints
export const contractorApi = {
  getAnalytics: async () => {
    const response = await apiClient.get('/contractor/analytics');
    return response.data;
  },
  
  getReferrals: async () => {
    const response = await apiClient.get('/contractor/referrals');
    return response.data;
  }
};

// Market data API endpoints
export const marketApi = {
  getPrices: async () => {
    const response = await apiClient.get('/market/prices');
    return response.data;
  },
  
  getExchangeRates: async () => {
    const response = await apiClient.get('/exchange-rates');
    return response.data;
  }
};

// Deposits API endpoints
export const depositsApi = {
  getDeposits: async () => {
    const response = await apiClient.get('/deposits');
    return response.data;
  },
  
  createDeposit: async (depositData: any) => {
    const response = await apiClient.post('/deposits', depositData);
    return response.data;
  },
  
  getDepositDetails: async (depositId: string | number) => {
    const response = await apiClient.get(`/deposits/${depositId}`);
    return response.data;
  }
};