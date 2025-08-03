import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import apiClient, { authApi } from '../api/apiClient';

// Create the authentication context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);
  const [twoFactorUsername, setTwoFactorUsername] = useState('');

  // Check for stored authentication on app start
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        // Load stored user data
        const userData = await AsyncStorage.getItem('user_data');
        
        if (userData) {
          const parsedUserData = JSON.parse(userData);
          setUser(parsedUserData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error loading stored authentication:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  // Clear authentication storage
  const clearAuthStorage = async () => {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
    } catch (error) {
      console.error('Error clearing auth storage:', error);
    }
  };

  // Save authentication data to storage
  const saveAuthData = async (userData) => {
    try {
      // Save auth token if provided
      if (userData.token) {
        await AsyncStorage.setItem('auth_token', userData.token);
      }
      
      // Save user data
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  };

  // Login method
  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.login(username, password);
      
      // Check if 2FA is required
      if (response.requireTwoFactor) {
        setRequireTwoFactor(true);
        setTwoFactorUsername(username);
        setLoading(false);
        return { success: true, requireTwoFactor: true };
      }
      
      // Regular successful login
      const userData = response.user || response;
      
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
        await saveAuthData(userData);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Verify two-factor authentication
  const verifyTwoFactor = async (code) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.post('/auth/verify-2fa', { 
        code,
        username: twoFactorUsername
      });
      
      const userData = response.data.user || response.data;
      
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
        setRequireTwoFactor(false);
        await saveAuthData(userData);
      }
      
      return { success: true };
    } catch (error) {
      console.error('2FA verification error:', error);
      const errorMessage = error.response?.data?.message || 'Verification failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Register a new user
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.register(userData);
      
      // Usually registration requires email verification
      // So we don't automatically log the user in
      
      Alert.alert(
        'Registration Successful', 
        'Your account has been created. Please check your email for verification instructions.',
        [{ text: 'OK' }]
      );
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout the current user
  const logout = async () => {
    try {
      setLoading(true);
      
      // Call logout API
      await authApi.logout();
      
      // Clear local authentication state
      setUser(null);
      setIsAuthenticated(false);
      await clearAuthStorage();
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Even if the server logout fails, clear local state
      setUser(null);
      setIsAuthenticated(false);
      await clearAuthStorage();
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  // Refresh user data from server
  const refreshUser = async () => {
    try {
      if (!isAuthenticated) return;
      
      const response = await authApi.checkAuth();
      
      if (response && response.user) {
        setUser(response.user);
        await saveAuthData(response.user);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error refreshing user data:', error);
      
      // If auth check fails with 401, user is no longer authenticated
      if (error.response && error.response.status === 401) {
        setUser(null);
        setIsAuthenticated(false);
        await clearAuthStorage();
      }
      
      return { success: false, error: error.message };
    }
  };

  // The authentication context value
  const authContextValue = {
    user,
    isAuthenticated,
    loading,
    error,
    requireTwoFactor,
    twoFactorUsername,
    login,
    register,
    logout,
    verifyTwoFactor,
    refreshUser
  };

  return (
    <AuthContext.Provider value={authContextValue}>
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