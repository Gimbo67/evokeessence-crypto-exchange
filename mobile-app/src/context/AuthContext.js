/**
 * Authentication Context for CryptoEvoke Exchange Mobile App
 * 
 * This module provides authentication state management for the application,
 * including login, logout, registration, and session persistence.
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';

// Create Auth Context
const AuthContext = createContext(null);

// Storage keys
const AUTH_TOKEN_KEY = '@CryptoEvoke:authToken';
const USER_DATA_KEY = '@CryptoEvoke:userData';

/**
 * Authentication Provider Component
 * 
 * Provides authentication state and methods to the application
 */
export const AuthProvider = ({ children }) => {
  // State variables
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);
  const [twoFactorUsername, setTwoFactorUsername] = useState('');
  
  // Initialize auth state from storage on app start
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        // Get stored user data
        const userData = await AsyncStorage.getItem(USER_DATA_KEY);
        
        if (userData) {
          // Parse user data
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          
          // Verify session with server
          try {
            const sessionData = await apiClient.auth.getSession();
            
            if (sessionData && sessionData.authenticated) {
              // Update user data with latest from server
              setUser({
                ...parsedUser,
                ...sessionData.user
              });
            } else {
              // Session expired or invalid, clear stored auth
              console.log('Session invalid, logging out');
              await clearAuthStorage();
              setUser(null);
            }
          } catch (error) {
            console.log('Session verification error:', error);
            // Keep user logged in when offline
          }
        }
      } catch (error) {
        console.error('Error loading stored auth:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStoredAuth();
  }, []);
  
  /**
   * Clear authentication storage
   */
  const clearAuthStorage = async () => {
    try {
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY]);
    } catch (error) {
      console.error('Error clearing auth storage:', error);
    }
  };
  
  /**
   * Save authentication data to storage
   * 
   * @param {Object} userData - User data to save
   */
  const saveAuthData = async (userData) => {
    try {
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  };
  
  /**
   * Login method
   * 
   * @param {string} username - Username
   * @param {string} password - Password
   * @param {string|null} recaptchaToken - Optional reCAPTCHA token
   * @returns {Object} - Login result
   */
  const login = async (username, password, recaptchaToken = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.auth.login(username, password, recaptchaToken);
      
      // Check if 2FA is required
      if (response.requireTwoFactor) {
        setRequireTwoFactor(true);
        setTwoFactorUsername(username);
        setLoading(false);
        return { requireTwoFactor: true };
      }
      
      // Save user data
      await saveAuthData(response);
      setUser(response);
      
      return { success: true, user: response };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Verify two-factor authentication
   * 
   * @param {string} code - Verification code
   * @returns {Object} - Verification result
   */
  const verifyTwoFactor = async (code) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.auth.verifyTwoFactor(twoFactorUsername, code);
      
      // Save user data
      await saveAuthData(response);
      setUser(response);
      
      // Reset 2FA state
      setRequireTwoFactor(false);
      setTwoFactorUsername('');
      
      return { success: true, user: response };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Register a new user
   * 
   * @param {Object} userData - User registration data
   * @param {string|null} recaptchaToken - Optional reCAPTCHA token
   * @returns {Object} - Registration result
   */
  const register = async (userData, recaptchaToken = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.auth.register(userData, recaptchaToken);
      return { success: true, data: response };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Logout the current user
   */
  const logout = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Call logout API
      await apiClient.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if API fails
    }
    
    // Clear stored auth data
    await clearAuthStorage();
    setUser(null);
    setLoading(false);
  };
  
  /**
   * Refresh user data from server
   */
  const refreshUser = async () => {
    try {
      const userData = await apiClient.user.getProfile();
      setUser((prevUser) => ({
        ...prevUser,
        ...userData,
      }));
      
      // Update stored user data
      if (user) {
        await saveAuthData({
          ...user,
          ...userData,
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Context value with authentication state and methods
  const contextValue = {
    user,
    loading,
    error,
    requireTwoFactor,
    twoFactorUsername,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin || user?.is_admin || false,
    isEmployee: user?.isEmployee || user?.is_employee || false,
    isContractor: user?.isContractor || user?.is_contractor || false,
    kycStatus: user?.kycStatus || user?.kyc_status || 'not_started',
    login,
    verifyTwoFactor,
    register,
    logout,
    refreshUser,
    clearError: () => setError(null),
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use the auth context
 * 
 * @returns {Object} Auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;