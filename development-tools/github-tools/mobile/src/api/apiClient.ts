import axios, { AxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { API_CONFIG } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_CONFIG.baseUrl,
  timeout: API_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Request interceptor for API calls
apiClient.interceptors.request.use(
  async (config) => {
    // Get auth token from storage if available
    const authToken = await AsyncStorage.getItem('auth_token');
    
    // Set common headers for mobile app
    config.headers['X-Platform'] = 'mobile';
    config.headers['X-App-Version'] = '1.0.0'; // Update with your app version
    config.headers['X-Device-OS'] = Platform.OS;
    
    // Add auth token if available
    if (authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 errors (unauthorized) - could implement token refresh here
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Implement token refresh logic here if needed
      // For now, just redirect to login on auth errors
      
      // Clear stored token on auth failure
      await AsyncStorage.removeItem('auth_token');
      
      // You would redirect to login screen here in a real app
      // navigation.navigate('Login');
    }
    
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // Auth endpoints
  auth: {
    login: (email: string, password: string) => 
      apiClient.post(API_CONFIG.endpoints.auth + '/login', { email, password }),
    
    register: (userData: any) => 
      apiClient.post(API_CONFIG.endpoints.auth + '/register', userData),
    
    logout: () => 
      apiClient.post(API_CONFIG.endpoints.auth + '/logout'),
      
    resetPassword: (email: string) => 
      apiClient.post(API_CONFIG.endpoints.auth + '/reset-password', { email }),
  },
  
  // User endpoints
  user: {
    getProfile: () => 
      apiClient.get(API_CONFIG.endpoints.user),
    
    updateProfile: (userData: any) => 
      apiClient.put(API_CONFIG.endpoints.user, userData),
      
    registerDevice: (deviceData: any) => 
      apiClient.post(API_CONFIG.endpoints.devices, deviceData),
      
    updateDeviceToken: (deviceId: string, token: string) => 
      apiClient.put(`${API_CONFIG.endpoints.devices}/${deviceId}`, { token }),
  },
  
  // Market endpoints
  market: {
    getPrices: () => 
      apiClient.get(API_CONFIG.endpoints.market),
  },
  
  // Generic request method
  request: <T>(config: AxiosRequestConfig): Promise<T> => {
    return apiClient(config)
      .then((response) => response.data)
      .catch((error) => {
        throw error;
      });
  }
};

export default api;