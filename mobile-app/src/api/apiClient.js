/**
 * API Client for CryptoEvoke Exchange Mobile App
 * 
 * This module provides methods for interacting with the evo-exchange.com API
 * endpoints, handling authentication, and managing API requests/responses.
 */

import { API_BASE_URL, ENDPOINTS, HTTP_METHODS, API_TIMEOUT, PLATFORM_IDENTIFIER } from './config';

/**
 * Makes an API request to the specified endpoint
 * 
 * @param {string} endpoint - The API endpoint to request
 * @param {Object} options - Request options
 * @returns {Promise<any>} - The response data
 */
const request = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Set default headers
  const headers = {
    'Content-Type': 'application/json',
    'X-App-Platform': PLATFORM_IDENTIFIER,
    ...options.headers
  };
  
  // Set up request configuration
  const config = {
    method: options.method || HTTP_METHODS.GET,
    headers,
    credentials: 'include', // Include cookies for session management
    ...options,
  };
  
  // If body is provided and it's an object, stringify it
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }
  
  // Set up request timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), API_TIMEOUT);
  });
  
  try {
    // Make request with timeout
    const response = await Promise.race([
      fetch(url, config),
      timeoutPromise
    ]);
    
    // Check if response is OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }
    
    // Parse response as JSON
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};

/**
 * API Client with methods for different endpoints
 */
const apiClient = {
  // Handle raw requests
  request,
  
  // Authentication methods
  auth: {
    /**
     * Log in a user
     * @param {string} username - Username
     * @param {string} password - Password
     * @returns {Promise<Object>} - User data or 2FA requirement
     */
    login: async (username, password, recaptchaToken = null) => {
      const body = { username, password };
      if (recaptchaToken) {
        body.recaptchaToken = recaptchaToken;
      }
      
      return request(ENDPOINTS.AUTH.LOGIN, {
        method: HTTP_METHODS.POST,
        body,
      });
    },
    
    /**
     * Register a new user
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} - Registration response
     */
    register: async (userData, recaptchaToken = null) => {
      const body = { ...userData };
      if (recaptchaToken) {
        body.recaptchaToken = recaptchaToken;
      }
      
      return request(ENDPOINTS.AUTH.REGISTER, {
        method: HTTP_METHODS.POST,
        body,
      });
    },
    
    /**
     * Verify two-factor authentication
     * @param {string} username - Username
     * @param {string} code - 2FA verification code
     * @returns {Promise<Object>} - Verification response
     */
    verifyTwoFactor: async (username, code) => {
      return request(ENDPOINTS.AUTH.VERIFY_2FA, {
        method: HTTP_METHODS.POST,
        body: { username, code },
      });
    },
    
    /**
     * Check current user session
     * @returns {Promise<Object>} - Session data
     */
    getSession: async () => {
      return request(ENDPOINTS.AUTH.SESSION);
    },
    
    /**
     * Log out the current user
     * @returns {Promise<Object>} - Logout response
     */
    logout: async () => {
      return request(ENDPOINTS.AUTH.LOGOUT, {
        method: HTTP_METHODS.POST,
      });
    },
  },
  
  // User methods
  user: {
    /**
     * Get user profile information
     * @returns {Promise<Object>} - User profile data
     */
    getProfile: async () => {
      return request(ENDPOINTS.USER.PROFILE);
    },
    
    /**
     * Update user profile
     * @param {Object} profileData - Updated profile data
     * @returns {Promise<Object>} - Updated profile response
     */
    updateProfile: async (profileData) => {
      return request(ENDPOINTS.USER.UPDATE_PROFILE, {
        method: HTTP_METHODS.PUT,
        body: profileData,
      });
    },
    
    /**
     * Get user transactions
     * @returns {Promise<Array>} - List of user transactions
     */
    getTransactions: async () => {
      return request(ENDPOINTS.USER.TRANSACTIONS);
    },
    
    /**
     * Get user KYC verification status
     * @returns {Promise<Object>} - KYC status data
     */
    getKycStatus: async () => {
      return request(ENDPOINTS.USER.KYC_STATUS);
    },
    
    /**
     * Start KYC verification process
     * @returns {Promise<Object>} - KYC initialization response
     */
    startKyc: async () => {
      return request(ENDPOINTS.USER.START_KYC, {
        method: HTTP_METHODS.POST,
      });
    },
  },
  
  // Market methods
  market: {
    /**
     * Get cryptocurrency prices
     * @returns {Promise<Array>} - List of cryptocurrency prices
     */
    getPrices: async () => {
      return request(ENDPOINTS.MARKET.PRICES);
    },
    
    /**
     * Get exchange rates
     * @returns {Promise<Object>} - Exchange rates data
     */
    getExchangeRates: async () => {
      return request(ENDPOINTS.MARKET.EXCHANGE_RATES);
    },
  },
  
  // Deposit methods
  deposits: {
    /**
     * Get user deposits
     * @returns {Promise<Array>} - List of user deposits
     */
    getDeposits: async () => {
      return request(ENDPOINTS.DEPOSITS.LIST);
    },
    
    /**
     * Create a new deposit
     * @param {Object} depositData - Deposit information
     * @returns {Promise<Object>} - Created deposit data
     */
    createDeposit: async (depositData) => {
      return request(ENDPOINTS.DEPOSITS.CREATE, {
        method: HTTP_METHODS.POST,
        body: depositData,
      });
    },
    
    /**
     * Get deposit details
     * @param {string|number} depositId - Deposit ID
     * @returns {Promise<Object>} - Deposit details
     */
    getDepositDetails: async (depositId) => {
      const endpoint = ENDPOINTS.DEPOSITS.DETAILS.replace(':id', depositId);
      return request(endpoint);
    },
  },
  
  // Contractor methods
  contractor: {
    /**
     * Get contractor analytics
     * @returns {Promise<Object>} - Contractor analytics data
     */
    getAnalytics: async () => {
      return request(ENDPOINTS.CONTRACTOR.ANALYTICS);
    },
    
    /**
     * Get contractor referrals
     * @returns {Promise<Array>} - List of contractor referrals
     */
    getReferrals: async () => {
      return request(ENDPOINTS.CONTRACTOR.REFERRALS);
    },
  },
  
  // Admin methods
  admin: {
    /**
     * Get admin analytics
     * @returns {Promise<Object>} - Admin analytics data
     */
    getAnalytics: async () => {
      return request(ENDPOINTS.ADMIN.ANALYTICS);
    },
    
    /**
     * Get user list for admin
     * @returns {Promise<Array>} - List of users
     */
    getUsers: async () => {
      return request(ENDPOINTS.ADMIN.USERS);
    },
    
    /**
     * Get employee list for admin
     * @returns {Promise<Array>} - List of employees
     */
    getEmployees: async () => {
      return request(ENDPOINTS.ADMIN.EMPLOYEES);
    },
  },
  
  // WebSocket methods
  websocket: {
    /**
     * Get WebSocket authentication token
     * @returns {Promise<Object>} - WebSocket token
     */
    getToken: async () => {
      return request(ENDPOINTS.WEBSOCKET.TOKEN);
    },
  },
  
  // App configuration
  app: {
    /**
     * Get app configuration
     * @returns {Promise<Object>} - App configuration data
     */
    getConfig: async () => {
      return request(ENDPOINTS.APP.CONFIG);
    },
  },
};

export default apiClient;