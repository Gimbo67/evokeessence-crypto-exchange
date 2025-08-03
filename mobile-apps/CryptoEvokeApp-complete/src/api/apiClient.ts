import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for your api - change this to your server address when deployed
const API_BASE_URL = 'https://cryptoevokeexchange.replit.app/api';
// For development on local network: 'http://192.168.1.x:5000/api'

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-App-Platform': 'ios', // Identify as iOS app
  }
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// API client methods
export const apiClient = {
  // Authentication
  async login(email: string, password: string) {
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async register(username: string, email: string, password: string) {
    try {
      const response = await axiosInstance.post('/auth/register', { 
        username, 
        email, 
        password 
      });
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  async logout() {
    try {
      await axiosInstance.post('/auth/logout');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  async getUserInfo() {
    try {
      const response = await axiosInstance.get('/auth/user');
      return response.data.user;
    } catch (error) {
      console.error('Get user info error:', error);
      throw error;
    }
  },

  // Market Data
  async getMarketPrices() {
    try {
      const response = await axiosInstance.get('/market/prices');
      return response.data;
    } catch (error) {
      console.error('Get market prices error:', error);
      throw error;
    }
  },

  // User Profile
  async getProfile() {
    try {
      const response = await axiosInstance.get('/profile');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  async updateProfile(profileData: any) {
    try {
      const response = await axiosInstance.put('/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  // Admin Functions
  async getAdminDashboard() {
    try {
      const response = await axiosInstance.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      console.error('Get admin dashboard error:', error);
      throw error;
    }
  },

  // Employee Functions
  async getEmployeeDashboard() {
    try {
      const response = await axiosInstance.get('/employee/dashboard');
      return response.data;
    } catch (error) {
      console.error('Get employee dashboard error:', error);
      throw error;
    }
  },

  async getClients() {
    try {
      const response = await axiosInstance.get('/employee/clients');
      return response.data;
    } catch (error) {
      console.error('Get clients error:', error);
      throw error;
    }
  },

  // User Dashboard
  async getUserDashboard() {
    try {
      const response = await axiosInstance.get('/user/dashboard');
      return response.data;
    } catch (error) {
      console.error('Get user dashboard error:', error);
      throw error;
    }
  },

  // KYC Verification
  async submitKYC(kycData: any) {
    try {
      const response = await axiosInstance.post('/kyc/submit', kycData);
      return response.data;
    } catch (error) {
      console.error('Submit KYC error:', error);
      throw error;
    }
  },

  async getKYCStatus() {
    try {
      const response = await axiosInstance.get('/kyc/status');
      return response.data;
    } catch (error) {
      console.error('Get KYC status error:', error);
      throw error;
    }
  }
};