import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import authService from '../services/authService';
import twoFactorAuthService from '../services/twoFactorAuthService';

// User type definition
export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  isEmployee?: boolean;
  isContractor?: boolean;
  verificationStatus?: 'none' | 'pending' | 'requested' | 'approved' | 'rejected';
  createdAt?: string;
  profilePictureUrl?: string;
}

// Authentication context type
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<any>;
  register: (userData: any) => Promise<boolean>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  refreshUserInfo: () => Promise<boolean>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication on app startup
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
          const userData = await authService.checkSession();
          if (userData) {
            setUser(userData);
          } else {
            // If session check fails, clear the stored token
            await SecureStore.deleteItemAsync('userToken');
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Clear any invalid tokens
        await SecureStore.deleteItemAsync('userToken');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (username: string, password: string) => {
    try {
      const response = await authService.login(username, password);
      
      // Check if 2FA is required
      if (response.requiresTwoFactor) {
        // Return response with userId for 2FA verification
        return {
          success: false,
          requiresTwoFactor: true,
          userId: response.userId,
          message: 'Two-factor authentication required'
        };
      }
      
      // If login successful and 2FA not required, set user and return success
      if (response.success && response.user) {
        setUser(response.user);
        return { success: true };
      }
      
      // If login failed
      return { 
        success: false, 
        message: response.message || 'Invalid credentials'
      };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: 'An error occurred during login'
      };
    }
  };

  // Register function
  const register = async (userData: any) => {
    try {
      const response = await authService.register(userData);
      if (response.success && response.user) {
        setUser(response.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      await SecureStore.deleteItemAsync('userToken');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Forgot password function
  const forgotPassword = async (email: string) => {
    try {
      const response = await authService.forgotPassword(email);
      return response.success;
    } catch (error) {
      console.error('Forgot password error:', error);
      return false;
    }
  };
  
  // Refresh user info function
  const refreshUserInfo = async () => {
    try {
      const userData = await authService.checkSession();
      if (userData) {
        setUser(userData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Refresh user info error:', error);
      return false;
    }
  };

  // Create the context value
  const contextValue: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    forgotPassword,
    refreshUserInfo
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};