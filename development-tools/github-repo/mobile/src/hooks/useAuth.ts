import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/apiClient';

// Define user type
export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  isEmployee: boolean;
  isContractor: boolean;
  profileImage?: string;
  hasTwoFactorAuth: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize - check for existing session
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Check if user is authenticated
  const checkAuthStatus = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Fetch user profile
      const response = await api.user.getProfile();
      
      if (response.data && response.data.user) {
        setUser(response.data.user);
      } else {
        // Invalid or expired token
        await AsyncStorage.removeItem('auth_token');
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setError('Authentication check failed');
      setUser(null);
      // Clear token if it's invalid
      await AsyncStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string, captchaToken?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const loginData: any = { email, password };
      
      // Add captcha token if provided
      if (captchaToken) {
        loginData.recaptchaToken = captchaToken;
      }
      
      const response = await api.auth.login(email, password);
      
      if (response.data && response.data.success) {
        // Store token
        await AsyncStorage.setItem('auth_token', response.data.token);
        
        // Update user state
        setUser(response.data.user);
        return true;
      } else {
        setError(response.data.message || 'Login failed');
        return false;
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (userData: any, captchaToken?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const registerData = { ...userData };
      
      // Add captcha token if provided
      if (captchaToken) {
        registerData.recaptchaToken = captchaToken;
      }
      
      const response = await api.auth.register(registerData);
      
      if (response.data && response.data.success) {
        // Registration successful
        return true;
      } else {
        setError(response.data.message || 'Registration failed');
        return false;
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    setLoading(true);
    
    try {
      // Call logout API
      await api.auth.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Always clear local storage and state, even if API call fails
      await AsyncStorage.removeItem('auth_token');
      setUser(null);
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    checkAuthStatus
  };
}