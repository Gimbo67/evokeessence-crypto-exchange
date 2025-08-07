import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure the base API URL
const API_BASE_URL = 'https://evo-exchange.com/api';
const CRYPTO_API_URL = 'https://crypto-api.evo-exchange.com';

// Create API client instance
const instance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-App-Platform': 'ios', // Identify this as the iOS app
  },
});

// Add token to requests
instance.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// API client functions
export const apiClient = {
  // Auth functions
  login: async (email: string, password: string) => {
    try {
      const response = await instance.post('/auth/login', { email, password });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return {
          success: false,
          message: error.response.data.message || 'Login failed',
        };
      }
      return { success: false, message: 'Network error' };
    }
  },

  register: async (username: string, email: string, password: string) => {
    try {
      const response = await instance.post('/auth/register', {
        username,
        email,
        password,
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        return {
          success: false,
          message: error.response.data.message || 'Registration failed',
        };
      }
      return { success: false, message: 'Network error' };
    }
  },

  logout: async () => {
    try {
      await instance.post('/auth/logout');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false };
    }
  },

  // User info
  getUserInfo: async () => {
    try {
      const response = await instance.get('/user/profile');
      return response.data.user;
    } catch (error) {
      console.error('Get user info error:', error);
      throw error;
    }
  },

  // Dashboard data
  getDashboardData: async () => {
    try {
      const response = await instance.get('/dashboard');
      return response.data;
    } catch (error) {
      console.error('Get dashboard data error:', error);
      throw error;
    }
  },

  // Crypto prices
  getCryptoPrices: async () => {
    try {
      const response = await axios.get(`${CRYPTO_API_URL}/prices`);
      return response.data;
    } catch (error) {
      console.error('Get crypto prices error:', error);
      throw error;
    }
  },

  // Transactions
  getTransactions: async () => {
    try {
      const response = await instance.get('/transactions');
      return response.data.transactions;
    } catch (error) {
      console.error('Get transactions error:', error);
      throw error;
    }
  },

  // Employee functions
  getClients: async () => {
    try {
      const response = await instance.get('/employee/clients');
      return response.data.clients;
    } catch (error) {
      console.error('Get clients error:', error);
      throw error;
    }
  },

  // Admin functions
  getAdminStats: async () => {
    try {
      const response = await instance.get('/admin/stats');
      return response.data;
    } catch (error) {
      console.error('Get admin stats error:', error);
      throw error;
    }
  },
};