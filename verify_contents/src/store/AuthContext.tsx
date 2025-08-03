import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';

type UserRole = 'admin' | 'employee' | 'user' | 'contractor';

interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  isEmployee: boolean;
  isVerified: boolean;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.post('/api/auth/login', {
        username,
        password,
        mobile_app: true
      });
      
      setUser(response.data.user);
      await AsyncStorage.setItem('authToken', response.data.token);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiClient.post('/api/auth/logout');
      setUser(null);
      await AsyncStorage.removeItem('authToken');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await apiClient.post('/api/auth/register', {
        username,
        email,
        password,
        mobile_app: true
      });
      
      setUser(response.data.user);
      await AsyncStorage.setItem('authToken', response.data.token);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        setUser(null);
        return;
      }
      
      const response = await apiClient.get('/api/auth/session');
      setUser(response.data.user);
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      await AsyncStorage.removeItem('authToken');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
