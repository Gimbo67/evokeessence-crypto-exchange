// Environment variables and app-wide constants
import Constants from 'expo-constants';

// API URLs and endpoints
export const API_URL = Constants.expoConfig?.extra?.apiUrl || 'https://api.evokeessence.com';

// Transak API key from environment
export const TRANSAK_API_KEY = Constants.expoConfig?.extra?.transakApiKey || '';

// Default app settings
export const DEFAULT_CURRENCY = 'USD';
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP'];
export const DEFAULT_LANGUAGE = 'en';

// Feature flags
export const FEATURE_BIOMETRICS_ENABLED = true;
export const FEATURE_PUSH_NOTIFICATIONS_ENABLED = true;
export const FEATURE_DARK_MODE_ENABLED = true;

// App constants
export const APP_NAME = 'EvokeEssence';
export const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

// For WebSocket connections
export const WS_URL = Constants.expoConfig?.extra?.wsUrl || 'wss://api.evokeessence.com/ws';

// Commission rate for contractors
export const COMMISSION_RATE = 0.10; // 10%