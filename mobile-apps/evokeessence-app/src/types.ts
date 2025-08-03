import { NavigatorScreenParams } from '@react-navigation/native';

// Authentication Stack
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Markets: undefined;
  Wallet: undefined;
  Trade: undefined;
  Verification: undefined;
  Profile: undefined;
  AdminDashboard: undefined;
  ContractorDashboard: undefined;
  Security: undefined;
  Notifications: undefined;
};

// Root Navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

// User Types
export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isVerified: boolean;
  isAdmin?: boolean;
  isEmployee?: boolean;
  type?: 'user' | 'admin' | 'employee' | 'contractor';
  referralCode?: string;
  createdAt: string;
  updatedAt: string;
}

// Authentication Context
export interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
}

// Register Data
export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  referralCode?: string;
}

// Market Data
export interface MarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  image: string;
  market_cap: number;
  total_volume: number;
}

// Transaction Data
export interface Transaction {
  id: number;
  userId: number;
  type: 'deposit' | 'withdrawal' | 'trade';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

// Wallet Data
export interface WalletBalance {
  currency: string;
  amount: number;
  usdValue: number;
  symbol: string;
}

// Admin Dashboard Stats
export interface AdminStats {
  totalUsers: number;
  newUsers: number;
  transactionVolume: number;
  pendingVerifications: number;
}

// Contractor Stats
export interface ContractorStats {
  referredUsers: number;
  activeReferredUsers: number;
  totalCommission: number;
  pendingCommission: number;
}

// Employee Stats
export interface EmployeeStats {
  assignedClients: number;
  pendingVerifications: number;
  completedVerifications: number;
}