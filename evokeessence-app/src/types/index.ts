export interface User {
  id: number;
  username: string;
  email: string;
  isAdmin?: boolean;
  isEmployee?: boolean;
  isContractor?: boolean;
  referralCode?: string;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
  message?: string;
}

export interface Market {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
}

export interface Transaction {
  id: number;
  type: 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface Wallet {
  id: number;
  currency: string;
  balance: number;
  address?: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ContractorStats {
  referralCount: number;
  depositCount: number;
  totalAmount: number;
  commission: number;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Markets: undefined;
  Wallet: undefined;
  Trade: undefined;
  Profile: undefined;
};