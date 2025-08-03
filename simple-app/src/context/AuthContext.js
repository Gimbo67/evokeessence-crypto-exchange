import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { authAPI } from '../services/api';

// Create the auth context
export const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isContractor, setIsContractor] = useState(false);
  
  // Initialize auth state
  useEffect(() => {
    checkLoginStatus();
  }, []);
  
  // Check if user is already logged in
  const checkLoginStatus = async () => {
    setLoading(true);
    try {
      // In a real app, get the saved token and verify with server
      // For demo, we'll simulate this
      setUser(null);
      setLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      setLoading(false);
    }
  };
  
  // Handle login
  const login = async (username, password) => {
    setLoading(true);
    try {
      // Simulate API call for login
      // const response = await authAPI.login(username, password);
      
      // Simulate response for demo
      const mockResponse = {
        user: {
          id: 1,
          username: username,
          email: 'user@example.com',
          isAdmin: username === 'admin',
          isContractor: username === 'contractor',
          needsTwoFactor: password === '2fa'
        },
        token: 'mock-token-12345',
        refreshToken: 'mock-refresh-token-12345'
      };
      
      if (mockResponse.user.needsTwoFactor) {
        setNeedsTwoFactor(true);
        setLoading(false);
        return { success: true, needsTwoFactor: true };
      }
      
      setUser(mockResponse.user);
      setIsAdmin(mockResponse.user.isAdmin);
      setIsContractor(mockResponse.user.isContractor);
      setLoading(false);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
      Alert.alert('Login Failed', error.message);
      return { success: false, error: error.message };
    }
  };
  
  // Handle registration
  const register = async (userData) => {
    setLoading(true);
    try {
      // Simulate API call for registration
      // const response = await authAPI.register(userData);
      
      // Simulate response for demo
      const mockResponse = {
        user: {
          id: 2,
          username: userData.username,
          email: userData.email,
          isAdmin: false,
          isContractor: false
        },
        token: 'mock-token-new-user',
        refreshToken: 'mock-refresh-token-new-user'
      };
      
      setUser(mockResponse.user);
      setIsAdmin(false);
      setIsContractor(false);
      setLoading(false);
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      setLoading(false);
      Alert.alert('Registration Failed', error.message);
      return { success: false, error: error.message };
    }
  };
  
  // Handle 2FA verification
  const verify2FA = async (code) => {
    setLoading(true);
    try {
      // Simulate API call for 2FA verification
      // const response = await authAPI.verify2FA(code);
      
      // Simulate response for demo
      const mockResponse = {
        user: {
          id: 1,
          username: 'user2fa',
          email: 'user2fa@example.com',
          isAdmin: false,
          isContractor: false
        },
        token: 'mock-token-after-2fa',
        refreshToken: 'mock-refresh-token-after-2fa'
      };
      
      setUser(mockResponse.user);
      setIsAdmin(mockResponse.user.isAdmin);
      setIsContractor(mockResponse.user.isContractor);
      setNeedsTwoFactor(false);
      setLoading(false);
      
      return { success: true };
    } catch (error) {
      console.error('2FA verification error:', error);
      setLoading(false);
      Alert.alert('Verification Failed', error.message);
      return { success: false, error: error.message };
    }
  };
  
  // Handle logout
  const logout = async () => {
    setLoading(true);
    try {
      // Simulate API call for logout
      // await authAPI.logout();
      
      setUser(null);
      setIsAdmin(false);
      setIsContractor(false);
      setNeedsTwoFactor(false);
      setLoading(false);
      
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      setLoading(false);
      Alert.alert('Logout Failed', error.message);
      
      // Still clear auth state even if API call fails
      setUser(null);
      setIsAdmin(false);
      setIsContractor(false);
      setNeedsTwoFactor(false);
      
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isContractor,
        needsTwoFactor,
        login,
        register,
        verify2FA,
        logout,
        checkLoginStatus
      }}
    >
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