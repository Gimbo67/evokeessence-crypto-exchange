import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use the production URL
const API_BASE_URL = 'https://evo-exchange.com';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Mobile-App': 'iOS'
  }
});

// Add request interceptor to include authentication token in all requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 errors (unauthorized)
    if (error.response && error.response.status === 401) {
      // Clear token on auth errors
      AsyncStorage.removeItem('authToken');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
