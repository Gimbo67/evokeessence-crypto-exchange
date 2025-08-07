import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { AuthResponse, RegisterData, User } from '../types';

// API URL - Will be replaced with actual URL when deployed
const API_URL = 'https://api.evokeessence.com/api';

// Set up axios instance with authorization header
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-App-Platform': 'ios',
  },
});

// Add interceptor to include auth token in requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const login = async (username: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post('/auth/login', { username, password });
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      user: {} as any,
      token: '',
      message: 'Login failed. Please check your credentials.',
    };
  }
};

export const register = async (userData: RegisterData): Promise<AuthResponse> => {
  try {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    console.error('Register error:', error);
    return {
      success: false,
      user: {} as User,
      token: '',
      message: 'Registration failed. Please try again.',
    };
  }
};

export const logout = async (): Promise<boolean> => {
  try {
    await apiClient.post('/auth/logout');
    return true;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
};

export const verifyToken = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/auth/verify');
    return response.data.valid;
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
};

export const forgotPassword = async (email: string): Promise<boolean> => {
  try {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data.success;
  } catch (error) {
    console.error('Forgot password error:', error);
    return false;
  }
};

export const resetPassword = async (token: string, password: string): Promise<boolean> => {
  try {
    const response = await apiClient.post('/auth/reset-password', { token, password });
    return response.data.success;
  } catch (error) {
    console.error('Reset password error:', error);
    return false;
  }
};