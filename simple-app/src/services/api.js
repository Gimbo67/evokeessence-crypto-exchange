import { Alert } from 'react-native';

// Base URL of your API server
const API_BASE_URL = 'https://api.evokeessence.com';

// Headers for iOS app identification
const getBaseHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'x-ios-app': 'true',
    'x-app-version': '1.0.0',
    'User-Agent': 'EvokeExchange-iOS-App/1.0.0'
  };
};

// Add authentication token to headers if available
const getAuthHeaders = async () => {
  const headers = getBaseHeaders();
  // In a real app, get this from SecureStore
  const token = null; // await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Handle API responses consistently
const handleResponse = async (response) => {
  if (response.status === 401) {
    // Token expired or invalid, try refresh token
    const refreshed = await refreshAuthToken();
    if (!refreshed) {
      // If refresh failed, clear tokens and redirect to login
      throw new Error('Authentication expired. Please log in again.');
    }
  }
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }
  
  return response.json();
};

// Refresh authentication token
const refreshAuthToken = async () => {
  try {
    // In a real app, get this from SecureStore
    const refreshToken = null; // await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;
    
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: getBaseHeaders(),
      body: JSON.stringify({ refreshToken })
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    // In a real app, store this in SecureStore
    // await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
    return true;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
};

// Authentication API calls
export const authAPI = {
  // Login with username and password
  login: async (username, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: getBaseHeaders(),
        body: JSON.stringify({ username, password })
      });
      
      const data = await handleResponse(response);
      
      // Store tokens securely
      if (data.token) {
        // In a real app, store this in SecureStore
        // await SecureStore.setItemAsync(AUTH_TOKEN_KEY, data.token);
      }
      
      if (data.refreshToken) {
        // In a real app, store this in SecureStore
        // await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  // Register new user
  register: async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: getBaseHeaders(),
        body: JSON.stringify(userData)
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  // Logout user
  logout: async () => {
    try {
      const headers = await getAuthHeaders();
      
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers
      });
      
      // Clear stored tokens
      // In a real app, clear this from SecureStore
      // await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      // await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear tokens even if the API call fails
      // In a real app, clear this from SecureStore
      // await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      // await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      return false;
    }
  },
  
  // Verify 2FA code
  verify2FA: async (code) => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-2fa`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ code })
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('2FA verification error:', error);
      throw error;
    }
  }
};

// User data API calls
export const userAPI = {
  // Get user profile information
  getProfile: async () => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'GET',
        headers
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },
  
  // Get user balance information
  getBalance: async () => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/user/balance`, {
        method: 'GET',
        headers
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Get balance error:', error);
      throw error;
    }
  },
  
  // Get user verification status
  getVerificationStatus: async () => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/user/verification-status`, {
        method: 'GET',
        headers
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Get verification status error:', error);
      throw error;
    }
  }
};

// Market and price data API calls
export const marketAPI = {
  // Get current cryptocurrency prices
  getPrices: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/market/prices`, {
        method: 'GET',
        headers: getBaseHeaders()
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Get market prices error:', error);
      throw error;
    }
  }
};

// Transaction API calls
export const transactionAPI = {
  // Get transaction history
  getHistory: async (page = 1, limit = 20) => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/transactions?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Get transaction history error:', error);
      throw error;
    }
  }
};

// Contractor dashboard API calls
export const contractorAPI = {
  // Get contractor analytics
  getAnalytics: async () => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/contractor/analytics`, {
        method: 'GET',
        headers
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Get contractor analytics error:', error);
      throw error;
    }
  }
};

// Admin dashboard API calls
export const adminAPI = {
  // Get users list for admin
  getUsers: async (page = 1, limit = 20) => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/admin/users?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Get users error:', error);
      throw error;
    }
  }
};

// WebSocket token
export const websocketAPI = {
  // Get WebSocket connection token
  getToken: async () => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/websocket/token`, {
        method: 'GET',
        headers
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Get WebSocket token error:', error);
      throw error;
    }
  }
};

// Transak widget integration
export const transakAPI = {
  // Get Transak widget URL with user parameters
  getWidgetURL: async () => {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/api/transak/widget-url`, {
        method: 'GET',
        headers
      });
      
      return handleResponse(response);
    } catch (error) {
      console.error('Get Transak widget URL error:', error);
      throw error;
    }
  }
};