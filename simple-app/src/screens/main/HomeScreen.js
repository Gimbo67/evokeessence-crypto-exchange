import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  SafeAreaView
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { userAPI, marketAPI } from '../../services/api';
import webSocketService, { EVENT_TYPES } from '../../services/websocket';

export default function HomeScreen({ navigation }) {
  const [balance, setBalance] = useState(null);
  const [prices, setPrices] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  
  const { user, isAdmin, isContractor } = useAuth();
  
  // Load initial data when component mounts
  useEffect(() => {
    loadData();
    
    // Connect to WebSocket for real-time updates
    webSocketService.connect();
    
    // Monitor WebSocket connection state
    const unsubscribeConnectionState = webSocketService.addConnectionStateListener((state) => {
      setIsWebSocketConnected(webSocketService.isConnected());
    });
    
    // Listen for balance updates
    const unsubscribeBalanceUpdate = webSocketService.addEventListener(
      EVENT_TYPES.BALANCE_UPDATE,
      handleBalanceUpdate
    );
    
    // Listen for notifications
    const unsubscribeNotification = webSocketService.addEventListener(
      EVENT_TYPES.SYSTEM_NOTIFICATION,
      handleNotification
    );
    
    return () => {
      // Clean up event listeners when component unmounts
      unsubscribeConnectionState();
      unsubscribeBalanceUpdate();
      unsubscribeNotification();
    };
  }, []);
  
  // Load all data for the home screen
  const loadData = async () => {
    setIsLoading(true);
    
    try {
      // Load user balance
      await fetchBalance();
      
      // Load market prices
      await fetchPrices();
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle pull-to-refresh
  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };
  
  // Fetch user's balance
  const fetchBalance = async () => {
    try {
      // In a real app, get this from the API
      // const balanceData = await userAPI.getBalance();
      
      // Simulate API response for demo
      const mockBalanceData = {
        total: 15420.75,
        currencies: [
          { symbol: 'BTC', name: 'Bitcoin', amount: 0.32, valueUSD: 10240.00, icon: '₿' },
          { symbol: 'ETH', name: 'Ethereum', amount: 5.75, valueUSD: 4500.50, icon: 'Ξ' },
          { symbol: 'USDT', name: 'Tether', amount: 680.25, valueUSD: 680.25, icon: '₮' }
        ]
      };
      
      setBalance(mockBalanceData);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };
  
  // Fetch cryptocurrency prices
  const fetchPrices = async () => {
    try {
      // In a real app, get this from the API
      // const priceData = await marketAPI.getPrices();
      
      // Simulate API response for demo
      const mockPriceData = [
        { symbol: 'BTC', name: 'Bitcoin', priceUSD: 32000.50, change24h: 2.34, icon: '₿' },
        { symbol: 'ETH', name: 'Ethereum', priceUSD: 782.75, change24h: -1.12, icon: 'Ξ' },
        { symbol: 'USDT', name: 'Tether', priceUSD: 1.00, change24h: 0.01, icon: '₮' },
        { symbol: 'BNB', name: 'Binance Coin', priceUSD: 240.25, change24h: 3.56, icon: 'Ƀ' },
        { symbol: 'SOL', name: 'Solana', priceUSD: 87.20, change24h: 7.23, icon: 'Ꞓ' }
      ];
      
      setPrices(mockPriceData);
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };
  
  // Handle real-time balance updates
  const handleBalanceUpdate = (payload) => {
    // Update the balance with the new data
    setBalance(currentBalance => {
      if (!currentBalance) return payload;
      
      // Create a deep copy of the current balance
      const updatedBalance = { ...currentBalance };
      
      // Update total balance
      updatedBalance.total = payload.total;
      
      // Update specific currencies
      updatedBalance.currencies = currentBalance.currencies.map(currency => {
        const updatedCurrency = payload.currencies.find(c => c.symbol === currency.symbol);
        return updatedCurrency || currency;
      });
      
      return updatedBalance;
    });
  };
  
  // Handle incoming notifications
  const handleNotification = (payload) => {
    setNotificationCount(count => count + 1);
  };
  
  // Navigate to buy crypto screen
  const handleBuyCrypto = () => {
    navigation.navigate('BuyCrypto');
  };
  
  // Format currency value
  const formatCurrency = (value) => {
    return '$' + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };
  
  // Render crypto price item
  const renderPriceItem = (item, index) => {
    const isPositiveChange = item.change24h >= 0;
    
    return (
      <TouchableOpacity 
        key={item.symbol} 
        style={styles.priceItem}
        onPress={() => navigation.navigate('Markets', { initialSymbol: item.symbol })}
      >
        <View style={styles.priceIcon}>
          <Text style={styles.cryptoIcon}>{item.icon}</Text>
        </View>
        <View style={styles.priceDetails}>
          <Text style={styles.cryptoName}>{item.name}</Text>
          <Text style={styles.cryptoSymbol}>{item.symbol}</Text>
        </View>
        <View style={styles.priceValues}>
          <Text style={styles.priceValue}>{formatCurrency(item.priceUSD)}</Text>
          <Text style={[
            styles.priceChange,
            isPositiveChange ? styles.positiveChange : styles.negativeChange
          ]}>
            {isPositiveChange ? '+' : ''}{item.change24h.toFixed(2)}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render user's balance items
  const renderBalanceItem = (item, index) => {
    return (
      <View key={item.symbol} style={styles.balanceItem}>
        <Text style={styles.balanceIcon}>{item.icon}</Text>
        <View style={styles.balanceDetails}>
          <Text style={styles.balanceName}>{item.name}</Text>
          <Text style={styles.balanceAmount}>{item.amount.toFixed(4)} {item.symbol}</Text>
        </View>
        <Text style={styles.balanceValue}>{formatCurrency(item.valueUSD)}</Text>
      </View>
    );
  };
  
  // Render loading state
  if (isLoading && !balance) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.username}>{user?.username || 'User'}</Text>
          </View>
          
          <View style={styles.connectionStatus}>
            <View style={[
              styles.connectionIndicator,
              isWebSocketConnected ? styles.connected : styles.disconnected
            ]} />
            <Text style={styles.connectionText}>
              {isWebSocketConnected ? 'Live' : 'Offline'}
            </Text>
          </View>
        </View>
        
        {/* Balance overview */}
        <View style={styles.balanceOverview}>
          <Text style={styles.sectionTitle}>Your Balance</Text>
          <Text style={styles.totalBalance}>{formatCurrency(balance?.total || 0)}</Text>
          
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryAction]}
              onPress={handleBuyCrypto}
            >
              <Text style={styles.actionButtonText}>Buy Crypto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('Wallet')}
            >
              <Text style={styles.actionButtonText}>Send / Receive</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Special buttons for admin/contractor */}
        {(isAdmin || isContractor) && (
          <View style={styles.specialAccessContainer}>
            {isAdmin && (
              <TouchableOpacity 
                style={styles.adminButton}
                onPress={() => navigation.navigate('AdminDashboard')}
              >
                <Text style={styles.specialButtonText}>Admin Dashboard</Text>
              </TouchableOpacity>
            )}
            
            {isContractor && (
              <TouchableOpacity 
                style={styles.contractorButton}
                onPress={() => navigation.navigate('ContractorDashboard')}
              >
                <Text style={styles.specialButtonText}>Contractor Dashboard</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Your assets */}
        <View style={styles.assetsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Assets</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Wallet')}>
              <Text style={styles.sectionAction}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.assetsList}>
            {balance?.currencies.map(renderBalanceItem)}
          </View>
        </View>
        
        {/* Market overview */}
        <View style={styles.marketContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Market Overview</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Markets')}>
              <Text style={styles.sectionAction}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.marketList}>
            {prices.map(renderPriceItem)}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connected: {
    backgroundColor: '#4CAF50',
  },
  disconnected: {
    backgroundColor: '#F44336',
  },
  connectionText: {
    fontSize: 12,
    color: '#666',
  },
  balanceOverview: {
    backgroundColor: '#0066FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  totalBalance: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 15,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  primaryAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  specialAccessContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  adminButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 10,
    flex: 1,
    alignItems: 'center',
  },
  contractorButton: {
    backgroundColor: '#9C27B0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    alignItems: 'center',
  },
  specialButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionAction: {
    color: '#0066FF',
    fontWeight: 'bold',
  },
  assetsContainer: {
    marginBottom: 20,
  },
  assetsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  balanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  balanceIcon: {
    fontSize: 20,
    width: 30,
    textAlign: 'center',
    marginRight: 10,
  },
  balanceDetails: {
    flex: 1,
  },
  balanceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  balanceAmount: {
    fontSize: 14,
    color: '#666',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  marketContainer: {
    marginBottom: 30,
  },
  marketList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  priceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  priceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cryptoIcon: {
    fontSize: 20,
  },
  priceDetails: {
    flex: 1,
  },
  cryptoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cryptoSymbol: {
    fontSize: 14,
    color: '#666',
  },
  priceValues: {
    alignItems: 'flex-end',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  priceChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  positiveChange: {
    color: '#4CAF50',
  },
  negativeChange: {
    color: '#F44336',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isWhiteText => isWhiteText ? '#fff' : '#333',
    marginBottom: 5,
  },
});