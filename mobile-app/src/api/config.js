/**
 * API Configuration for CryptoEvoke Exchange Mobile App
 * 
 * This file contains the API endpoint configuration for connecting
 * to the evo-exchange.com backend services.
 */

// Base URL for the API
export const API_BASE_URL = 'https://evo-exchange.com/api';

// Timeout for API requests in milliseconds
export const API_TIMEOUT = 15000;

// App platform identifier for API requests
export const PLATFORM_IDENTIFIER = 'ios-app';

// API endpoints
export const ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    SESSION: '/auth/session',
    LOGOUT: '/auth/logout',
    VERIFY_2FA: '/auth/verify-2fa',
  },
  
  // User endpoints
  USER: {
    PROFILE: '/user/profile',
    TRANSACTIONS: '/user/transactions',
    KYC_STATUS: '/user/kyc/status',
    START_KYC: '/user/kyc/start',
    UPDATE_PROFILE: '/user/profile/update',
  },
  
  // Market endpoints
  MARKET: {
    PRICES: '/market/prices',
    EXCHANGE_RATES: '/exchange-rates',
  },
  
  // Deposit endpoints
  DEPOSITS: {
    LIST: '/deposits',
    CREATE: '/deposits',
    DETAILS: '/deposits/:id',
  },
  
  // Contractor endpoints
  CONTRACTOR: {
    ANALYTICS: '/contractor/analytics',
    REFERRALS: '/contractor/referrals',
  },
  
  // Admin endpoints
  ADMIN: {
    ANALYTICS: '/admin/analytics',
    USERS: '/admin/users',
    EMPLOYEES: '/admin/employees',
  },
  
  // Websocket
  WEBSOCKET: {
    TOKEN: '/websocket/token',
    CONNECT: '/ws',
  },
  
  // App configuration
  APP: {
    CONFIG: '/app-config',
  }
};

// HTTP request methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
};