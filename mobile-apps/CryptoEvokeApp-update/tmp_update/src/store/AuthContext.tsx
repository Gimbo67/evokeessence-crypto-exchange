import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/apiClient';

// Define user types and roles
export type UserRole = 'client' | 'admin' | 'employee';

export interface User {
  id: string;
  username: string;
  email: string;
  isVerified: boolean;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
});

// Provider component that wraps your app and makes auth object available
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check for existing auth on app startup
  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const userData = await AsyncStorage.getItem('user_data');
        
        if (userData) {
          setUser(JSON.parse(userData));
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to load user data from storage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  // Login function
  const login = async (username: string, password: string) => {
    setIsLoading(true);
    
    try {
      const response = await authApi.login(username, password);
      
      // Store auth token
      if (response.token) {
        await AsyncStorage.setItem('auth_token', response.token);
      }
      
      // Store user data
      const userData = response.user;
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: any) => {
    setIsLoading(true);
    
    try {
      const response = await authApi.register(userData);
      
      // Auto-login after successful registration if token is returned
      if (response.token) {
        await AsyncStorage.setItem('auth_token', response.token);
      }
      
      if (response.user) {
        await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
        setUser(response.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local logout even if API call fails
    }
    
    // Clear all auth-related storage
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_data');
    
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  };

  // Check authentication status
  const checkAuth = async () => {
    setIsLoading(true);
    
    try {
      const response = await authApi.checkAuth();
      
      if (response.authenticated && response.user) {
        await AsyncStorage.setItem('user_data', JSON.stringify(response.user));
        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        // User is not authenticated
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('user_data');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Assume not authenticated on error
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    checkAuth,
  };

  // Provide the context to children components
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};