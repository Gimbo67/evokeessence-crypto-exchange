import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../api/config';
import apiClient from '../api/apiClient';
import errorHandler from '../utils/ErrorHandler';

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state from storage
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  // Load user data from storage (if exists)
  const loadUserFromStorage = async () => {
    try {
      setIsLoading(true);
      
      // Check if user data exists in storage
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      
      if (userData && token) {
        // Parse user data
        const parsedUserData = JSON.parse(userData);
        
        // Set user and auth state
        setUser(parsedUserData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // Clear any potentially corrupted data
      await clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  // Login user
  const login = async (username, password, code = null, biometricToken = null) => {
    try {
      let response;
      
      if (biometricToken) {
        // Login with biometric token
        response = await apiClient.post('/api/auth/login/biometric', { 
          username, 
          biometricToken 
        });
      } else if (code) {
        // Login with 2FA code
        response = await apiClient.post('/api/auth/verify-2fa', { 
          username, 
          code 
        });
      } else {
        // Regular login
        response = await apiClient.post('/api/auth/login', { 
          username, 
          password 
        });
      }
      
      // If login successful and we have token
      if (response.success && response.token) {
        // Save auth data to storage
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
        
        if (response.refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
        }
        
        if (response.user) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));
          setUser(response.user);
        }
        
        setIsAuthenticated(true);
      }
      
      return response;
    } catch (error) {
      errorHandler.handleApiError(error);
      return {
        success: false,
        message: error.message || 'Login failed'
      };
    }
  };

  // Register new user
  const register = async (userData) => {
    try {
      const response = await apiClient.post('/api/auth/register', userData);
      
      return response;
    } catch (error) {
      errorHandler.handleApiError(error);
      return {
        success: false,
        message: error.message || 'Registration failed'
      };
    }
  };

  // Logout user
  const logout = async () => {
    try {
      // Call logout API
      await apiClient.post('/api/auth/logout');
      
      // Clear auth data
      await clearAuthData();
      
      // Reset state
      setUser(null);
      setIsAuthenticated(false);
      
      return { success: true };
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Even if API call fails, clear local data
      await clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
      
      return { success: true };
    }
  };

  // Verify session
  const verifySession = async () => {
    try {
      const response = await apiClient.get('/api/auth/session');
      
      if (!response.success || !response.user) {
        // Session is invalid, clear auth data
        await clearAuthData();
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }
      
      // Update user data if needed
      if (response.user) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));
        setUser(response.user);
      }
      
      return true;
    } catch (error) {
      console.error('Error verifying session:', error);
      
      // If session verification fails, assume session is invalid
      await clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
      
      return false;
    }
  };

  // Update user data
  const updateUserData = async (userData) => {
    try {
      // Update user data in storage
      const currentUserData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      
      if (currentUserData) {
        const parsedUserData = JSON.parse(currentUserData);
        const updatedUserData = { ...parsedUserData, ...userData };
        
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUserData));
        setUser(updatedUserData);
      }
    } catch (error) {
      console.error('Error updating user data:', error);
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await apiClient.post('/api/user/change-password', {
        currentPassword,
        newPassword
      });
      
      return response;
    } catch (error) {
      errorHandler.handleApiError(error);
      return {
        success: false,
        message: error.message || 'Failed to change password'
      };
    }
  };

  // Request password reset
  const requestPasswordReset = async (email) => {
    try {
      const response = await apiClient.post('/api/auth/forgot-password', { email });
      
      return response;
    } catch (error) {
      errorHandler.handleApiError(error);
      return {
        success: false,
        message: error.message || 'Failed to request password reset'
      };
    }
  };

  // Reset password with token
  const resetPassword = async (token, newPassword) => {
    try {
      const response = await apiClient.post('/api/auth/reset-password', {
        token,
        newPassword
      });
      
      return response;
    } catch (error) {
      errorHandler.handleApiError(error);
      return {
        success: false,
        message: error.message || 'Failed to reset password'
      };
    }
  };

  // Setup two-factor authentication
  const setupTwoFactor = async () => {
    try {
      const response = await apiClient.post('/api/auth/setup-2fa');
      
      return response;
    } catch (error) {
      errorHandler.handleApiError(error);
      return {
        success: false,
        message: error.message || 'Failed to setup two-factor authentication'
      };
    }
  };

  // Verify two-factor authentication
  const verifyTwoFactor = async (userId, code, token) => {
    try {
      const response = await apiClient.post('/api/auth/verify-2fa', {
        userId,
        code,
        token
      });
      
      // If verification successful and we have token
      if (response.success && response.token) {
        // Save auth data to storage
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
        
        if (response.refreshToken) {
          await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
        }
        
        if (response.user) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));
          setUser(response.user);
        }
        
        setIsAuthenticated(true);
      }
      
      return response;
    } catch (error) {
      errorHandler.handleApiError(error);
      return {
        success: false,
        message: error.message || 'Failed to verify two-factor authentication'
      };
    }
  };

  // Clear auth data from storage
  const clearAuthData = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.BIOMETRIC_AUTH_TOKEN);
      
      // Don't clear saved username or remember me setting
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  };

  // Context value
  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    verifySession,
    updateUserData,
    changePassword,
    requestPasswordReset,
    resetPassword,
    setupTwoFactor,
    verifyTwoFactor
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;