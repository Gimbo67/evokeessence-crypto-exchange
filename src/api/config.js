/**
 * API Configuration
 * This file contains API endpoints and other configuration values
 */

// API Base URL - Change this to the actual API URL when deploying
export const API_BASE_URL = 'https://api.evokeessence.com';

// WebSocket URL
export const WEBSOCKET_URL = 'wss://ws.evokeessence.com';

// API Endpoints
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    VERIFY_2FA: '/api/auth/verify-2fa',
    SETUP_2FA: '/api/auth/setup-2fa',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    SESSION: '/api/auth/session'
  },
  
  // User endpoints
  USER: {
    PROFILE: '/api/user/profile',
    UPDATE_PROFILE: '/api/user/profile/update',
    CHANGE_PASSWORD: '/api/user/change-password',
    NOTIFICATIONS: '/api/user/notifications',
    PREFERENCES: '/api/user/preferences'
  },
  
  // Market endpoints
  MARKET: {
    PRICES: '/api/market/prices',
    CHART_DATA: '/api/market/chart',
    ASSETS: '/api/market/assets',
    CONVERT: '/api/market/convert'
  },
  
  // Transaction endpoints
  TRANSACTION: {
    DEPOSIT: '/api/transaction/deposit',
    WITHDRAW: '/api/transaction/withdraw',
    HISTORY: '/api/transaction/history',
    DETAILS: '/api/transaction/details',
    CONVERT: '/api/transaction/convert'
  },
  
  // Wallet endpoints
  WALLET: {
    BALANCES: '/api/wallet/balances',
    ADDRESSES: '/api/wallet/addresses',
    GENERATE_ADDRESS: '/api/wallet/generate-address'
  },
  
  // KYC endpoints
  KYC: {
    STATUS: '/api/kyc/status',
    SUBMIT: '/api/kyc/submit',
    UPLOAD_DOCUMENT: '/api/kyc/upload-document'
  },
  
  // Contractor endpoints
  CONTRACTOR: {
    DASHBOARD: '/api/contractor/dashboard',
    REFERRALS: '/api/contractor/referrals',
    COMMISSIONS: '/api/contractor/commissions',
    ANALYTICS: '/api/contractor/analytics'
  },
  
  // Admin endpoints
  ADMIN: {
    USERS: '/api/admin/users',
    USER_DETAILS: '/api/admin/users/:id',
    TRANSACTIONS: '/api/admin/transactions',
    DEPOSITS: '/api/admin/deposits',
    WITHDRAWALS: '/api/admin/withdrawals',
    KYC_SUBMISSIONS: '/api/admin/kyc-submissions',
    KYC_DETAILS: '/api/admin/kyc-submissions/:id',
    DASHBOARD: '/api/admin/dashboard',
    EMPLOYEES: '/api/admin/employees',
    CONTRACTORS: '/api/admin/contractors'
  },
  
  // Push notification endpoints
  NOTIFICATIONS: {
    REGISTER_DEVICE: '/api/notifications/register-device',
    UPDATE_DEVICE_TOKEN: '/api/notifications/update-device-token',
    SETTINGS: '/api/notifications/settings'
  },
  
  // WebSocket endpoints
  WEBSOCKET: {
    GET_TOKEN: '/api/websocket/token'
  }
};

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 30000;

// AsyncStorage Keys
export const STORAGE_KEYS = {
  // Auth keys
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  BIOMETRIC_AUTH_TOKEN: 'biometric_auth_token',
  
  // Settings keys
  LANGUAGE: 'language',
  THEME: 'theme',
  CURRENCY: 'currency',
  BIOMETRICS_ENABLED: 'biometrics_enabled',
  USE_BIOMETRICS_AT_LOGIN: 'use_biometrics_at_login',
  
  // Cache keys
  ASSETS_CACHE: 'assets_cache',
  PRICES_CACHE: 'prices_cache',
  BALANCES_CACHE: 'balances_cache',
  
  // Session keys
  SAVED_USERNAME: 'saved_username',
  REMEMBER_ME: 'remember_me',
  
  // Intro and onboarding
  HAS_SEEN_INTRO: 'has_seen_intro',
  COMPLETED_ONBOARDING: 'completed_onboarding',
  
  // Notification keys
  PUSH_NOTIFICATION_TOKEN: 'push_notification_token',
  DEVICE_ID: 'device_id',
  
  // Feature flags
  FEATURE_FLAGS: 'feature_flags'
};

// Default API request headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-App-Version': '1.0.0',
  'X-Platform': 'ios'
};

// App specific configuration
export const APP_CONFIG = {
  DEFAULT_LANGUAGE: 'en',
  AVAILABLE_LANGUAGES: ['en', 'cs', 'sk', 'de', 'es', 'fr'],
  DEFAULT_CURRENCY: 'USD',
  AVAILABLE_CURRENCIES: ['USD', 'EUR', 'GBP', 'CZK'],
  DEFAULT_THEME: 'light',
  WEBSOCKET_RECONNECT_INTERVAL: 3000,
  MAX_WEBSOCKET_RECONNECT_ATTEMPTS: 5,
  PRICE_UPDATE_INTERVAL: 30000, // 30 seconds
  SESSION_TIMEOUT: 1800000, // 30 minutes
  INACTIVE_TIMEOUT: 300000, // 5 minutes
  MINIMUM_PASSWORD_LENGTH: 8,
  MINIMUM_WITHDRAW_AMOUNT: 50,
  KYC_DOCUMENT_SIZE_LIMIT: 5 * 1024 * 1024, // 5MB
  KYC_DOCUMENT_TYPES: ['passport', 'national_id', 'driving_license', 'residence_permit'],
  KYC_SELFIE_SIZE_LIMIT: 3 * 1024 * 1024, // 3MB
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  COMMISSION_RATE: 0.01 // 1%
};