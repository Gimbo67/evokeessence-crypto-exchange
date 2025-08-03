import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/apiClient';

// Define types
interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  isEmployee: boolean;
  isVerified: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userData: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

// Create context
export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userData: null,
  login: async () => false,
  register: async () => false,
  logout: () => {},
  loading: false,
  error: null,
});

// Create provider
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          // Get user data
          const userData = await apiClient.getUserInfo();
          setUserData(userData);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.login(email, password);
      
      if (response.success) {
        await AsyncStorage.setItem('authToken', response.token);
        setUserData(response.user);
        setIsAuthenticated(true);
        return true;
      } else {
        setError(response.message || 'Login failed');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (username: string, email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.register(username, email, password);
      
      if (response.success) {
        await AsyncStorage.setItem('authToken', response.token);
        setUserData(response.user);
        setIsAuthenticated(true);
        return true;
      } else {
        setError(response.message || 'Registration failed');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await apiClient.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsAuthenticated(false);
      setUserData(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userData,
        login,
        register,
        logout,
        loading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};