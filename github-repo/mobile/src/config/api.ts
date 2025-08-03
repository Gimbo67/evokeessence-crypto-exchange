/**
 * API Configuration for EvokeEssence Exchange Mobile App
 */
export const API_CONFIG = {
  baseUrl: 'https://api.evokeexchange.com', // Change this to your actual API base URL
  wsUrl: 'wss://api.evokeexchange.com/ws', // WebSocket URL for real-time updates
  timeout: 30000, // API request timeout in milliseconds
  endpoints: {
    auth: '/api/auth',
    user: '/api/user',
    market: '/api/market/prices',
    devices: '/api/user/devices',
    transactions: '/api/transactions',
    deposits: '/api/deposits',
    kyc: '/api/kyc',
    notifications: '/api/notifications',
    security: '/api/security',
    twoFactor: '/api/2fa'
  }
};