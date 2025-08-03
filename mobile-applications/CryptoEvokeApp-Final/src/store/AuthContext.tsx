import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/apiClient';

type UserRole = 'admin' | 'employee' | 'verified' | 'unverified' | null;

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);

  useEffect(() => {
    // Check if the user is already logged in
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          // Get user info to determine role
          const response = await apiClient.get('/api/user');
          setUserRole(response.data.role);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Clear any invalid data
        await AsyncStorage.removeItem('authToken');
        setIsAuthenticated(false);
        setUserRole(null);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.post('/api/auth/login', { 
        email, 
        password,
        platform: 'ios'
      });
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('authToken', token);
      setUserRole(user.role);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await apiClient.post('/api/auth/register', { 
        name, 
        email, 
        password,
        platform: 'ios'
      });
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('authToken', token);
      setUserRole('unverified'); // New users start as unverified
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      setIsAuthenticated(false);
      setUserRole(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};