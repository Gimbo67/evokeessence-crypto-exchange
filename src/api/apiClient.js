import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_BASE_URL, API_ENDPOINTS, REQUEST_TIMEOUT, DEFAULT_HEADERS, STORAGE_KEYS } from './config';

/**
 * API Client for making requests to the backend
 * This service handles authentication, request formatting, and response parsing
 */
class ApiClient {
  constructor() {
    // Create axios instance with default config
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: REQUEST_TIMEOUT,
      headers: {
        ...DEFAULT_HEADERS,
        'User-Agent': `EvokeEssence-iOS/${Platform.Version}`
      }
    });

    // Add request interceptor for authentication
    this.instance.interceptors.request.use(
      async (config) => {
        // Get auth token from storage
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        
        // If token exists, add to headers
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for handling refresh tokens
    this.instance.interceptors.response.use(
      (response) => {
        // Return just the data from the response
        return response.data;
      },
      async (error) => {
        const originalRequest = error.config;
        
        // If 401 error (unauthorized) and not already retrying
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
          // Mark as retrying
          originalRequest._retry = true;
          
          try {
            // Try to refresh the token
            const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
            
            if (refreshToken) {
              // Call token refresh endpoint
              const response = await axios.post(
                `${API_BASE_URL}/api/auth/refresh-token`,
                { refreshToken },
                { headers: DEFAULT_HEADERS }
              );
              
              // If successful, update tokens
              if (response.data && response.data.token) {
                await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.data.token);
                
                if (response.data.refreshToken) {
                  await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.data.refreshToken);
                }
                
                // Update auth header and retry request
                originalRequest.headers['Authorization'] = `Bearer ${response.data.token}`;
                return this.instance(originalRequest);
              }
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            
            // Clear tokens and user data on refresh failure
            await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
            await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            
            // Don't remove user data here to prevent UI flashing
            // The auth context will handle this when checking session
          }
        }
        
        // For all other errors, reject with the error
        return Promise.reject(this.formatError(error));
      }
    );
  }

  /**
   * Format error response
   * @param {Error} error - Axios error object
   * @returns {Error} - Formatted error
   */
  formatError(error) {
    if (error.response) {
      // The server responded with a status code outside of 2xx
      error.message = error.response.data?.message || error.response.data?.error || 'Server error';
      error.status = error.response.status;
      error.data = error.response.data;
    } else if (error.request) {
      // The request was made but no response was received
      error.message = 'No response from server. Please check your internet connection.';
      error.status = 0;
    }
    
    return error;
  }

  /**
   * Make a GET request
   * @param {string} url - API endpoint
   * @param {Object} params - URL parameters
   * @param {Object} options - Additional options
   * @returns {Promise<any>} - API response
   */
  async get(url, params = {}, options = {}) {
    try {
      return await this.instance.get(url, { params, ...options });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Make a POST request
   * @param {string} url - API endpoint
   * @param {Object} data - Request body data
   * @param {Object} options - Additional options
   * @returns {Promise<any>} - API response
   */
  async post(url, data = {}, options = {}) {
    try {
      return await this.instance.post(url, data, options);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Make a PUT request
   * @param {string} url - API endpoint
   * @param {Object} data - Request body data
   * @param {Object} options - Additional options
   * @returns {Promise<any>} - API response
   */
  async put(url, data = {}, options = {}) {
    try {
      return await this.instance.put(url, data, options);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Make a PATCH request
   * @param {string} url - API endpoint
   * @param {Object} data - Request body data
   * @param {Object} options - Additional options
   * @returns {Promise<any>} - API response
   */
  async patch(url, data = {}, options = {}) {
    try {
      return await this.instance.patch(url, data, options);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Make a DELETE request
   * @param {string} url - API endpoint
   * @param {Object} options - Additional options
   * @returns {Promise<any>} - API response
   */
  async delete(url, options = {}) {
    try {
      return await this.instance.delete(url, options);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload file(s)
   * @param {string} url - API endpoint
   * @param {FormData} formData - Form data with files
   * @param {Function} onProgress - Progress callback
   * @param {Object} options - Additional options
   * @returns {Promise<any>} - API response
   */
  async upload(url, formData, onProgress = null, options = {}) {
    try {
      const uploadOptions = {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        ...options
      };
      
      if (onProgress) {
        uploadOptions.onUploadProgress = (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        };
      }
      
      return await this.instance.post(url, formData, uploadOptions);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Download file
   * @param {string} url - API endpoint
   * @param {Object} params - URL parameters
   * @param {Function} onProgress - Progress callback
   * @param {Object} options - Additional options
   * @returns {Promise<any>} - API response
   */
  async download(url, params = {}, onProgress = null, options = {}) {
    try {
      const downloadOptions = {
        responseType: 'blob',
        params,
        ...options
      };
      
      if (onProgress) {
        downloadOptions.onDownloadProgress = (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        };
      }
      
      return await this.instance.get(url, downloadOptions);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get WebSocket authentication token
   * @returns {Promise<string>} - WebSocket token
   */
  async getWebSocketToken() {
    try {
      const response = await this.get(API_ENDPOINTS.WEBSOCKET.GET_TOKEN);
      
      if (response.success && response.token) {
        return response.token;
      }
      
      throw new Error('Failed to get WebSocket token');
    } catch (error) {
      throw error;
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;