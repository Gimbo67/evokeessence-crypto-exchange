import axios from 'axios';

const API_BASE_URL = 'https://api.evokeessence.com';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Mobile-App': 'iOS'
  }
});

export default apiClient;
