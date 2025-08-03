import { apiClient } from './authService';
import { Market, Transaction, Wallet, Notification, ContractorStats } from '../types';

// Get markets data
export const getMarkets = async (): Promise<Market[]> => {
  try {
    const response = await apiClient.get('/markets');
    return response.data;
  } catch (error) {
    console.error('Error fetching markets:', error);
    // Provide sample data for development/testing
    return [
      {
        id: '1',
        name: 'Bitcoin',
        symbol: 'BTC',
        price: 42850.75,
        change24h: 2.45,
        volume24h: 32456789.98,
      },
      {
        id: '2',
        name: 'Ethereum',
        symbol: 'ETH',
        price: 2340.89,
        change24h: 1.23,
        volume24h: 18734567.43,
      },
      {
        id: '3',
        name: 'USDT',
        symbol: 'USDT',
        price: 1.0,
        change24h: 0.01,
        volume24h: 78234567.21,
      },
      {
        id: '4',
        name: 'USDC',
        symbol: 'USDC',
        price: 1.0,
        change24h: 0.02,
        volume24h: 45678912.34,
      },
      {
        id: '5',
        name: 'Solana',
        symbol: 'SOL',
        price: 129.87,
        change24h: -3.42,
        volume24h: 9876543.21,
      },
    ];
  }
};

// Get recent transactions
export const getRecentTransactions = async (): Promise<Transaction[]> => {
  try {
    const response = await apiClient.get('/transactions/recent');
    return response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    // Provide sample data for development/testing
    return [
      {
        id: 1,
        type: 'deposit',
        amount: 0.25,
        currency: 'BTC',
        status: 'completed',
        createdAt: '2025-05-18T14:32:21Z',
      },
      {
        id: 2,
        type: 'withdrawal',
        amount: 500,
        currency: 'USDC',
        status: 'pending',
        createdAt: '2025-05-17T09:15:43Z',
      },
      {
        id: 3,
        type: 'deposit',
        amount: 1200,
        currency: 'USDT',
        status: 'completed',
        createdAt: '2025-05-16T18:27:33Z',
      },
    ];
  }
};

// Get user wallets
export const getWallets = async (): Promise<Wallet[]> => {
  try {
    const response = await apiClient.get('/wallets');
    return response.data;
  } catch (error) {
    console.error('Error fetching wallets:', error);
    // Provide sample data for development/testing
    return [
      {
        id: 1,
        currency: 'BTC',
        balance: 0.325,
        address: 'bc1q9h8sr5x0qv4wkpl93j9nj6jg0qhgxz5zc2dhql',
      },
      {
        id: 2,
        currency: 'ETH',
        balance: 2.5,
        address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      },
      {
        id: 3,
        currency: 'USDT',
        balance: 1200,
        address: 'TXh6FrVQVE9VK47xzScJxnhW8MpD2jNNjP',
      },
      {
        id: 4,
        currency: 'USDC',
        balance: 850,
        address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      },
    ];
  }
};

// Get user notifications
export const getNotifications = async (): Promise<Notification[]> => {
  try {
    const response = await apiClient.get('/notifications');
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Provide sample data for development/testing
    return [
      {
        id: 1,
        title: 'Deposit Confirmed',
        message: 'Your deposit of 0.25 BTC has been confirmed and credited to your account.',
        read: false,
        createdAt: '2025-05-18T14:32:21Z',
      },
      {
        id: 2,
        title: 'Withdrawal Processing',
        message: 'Your withdrawal request for 500 USDC is being processed.',
        read: true,
        createdAt: '2025-05-17T09:15:43Z',
      },
      {
        id: 3,
        title: 'Security Alert',
        message: 'A new device was used to log into your account. If this wasn\'t you, please contact support immediately.',
        read: false,
        createdAt: '2025-05-16T22:10:05Z',
      },
    ];
  }
};

// Get contractor statistics
export const getContractorStats = async (): Promise<ContractorStats> => {
  try {
    const response = await apiClient.get('/contractor/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching contractor stats:', error);
    // Provide sample data for development/testing
    return {
      referralCount: 23,
      depositCount: 15,
      totalAmount: 4582,
      commission: 458.2,
    };
  }
};

// Get referral code
export const getReferralCode = async (): Promise<string> => {
  try {
    const response = await apiClient.get('/referral/code');
    return response.data.code;
  } catch (error) {
    console.error('Error fetching referral code:', error);
    return 'A64S'; // Sample referral code
  }
};