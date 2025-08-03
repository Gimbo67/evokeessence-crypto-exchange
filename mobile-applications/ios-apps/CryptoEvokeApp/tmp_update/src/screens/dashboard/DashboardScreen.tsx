import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../../store/AuthContext';
import { marketApi, userApi } from '../../api/apiClient';

// Define the cryptocurrency price type
interface CryptoPrice {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number;
  priceChangePercentage24h: number;
}

const DashboardScreen = () => {
  const { user, logout } = useAuth();
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice[]>([]);
  const [userBalance, setUserBalance] = useState<Record<string, number>>({});
  const [refreshing, setRefreshing] = useState(false);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Function to load all dashboard data
  const loadDashboardData = async () => {
    try {
      // Load cryptocurrency prices
      const pricesData = await marketApi.getPrices();
      setCryptoPrices(pricesData.prices || []);
      
      // Load user profile data including balances
      const profileData = await userApi.getProfile();
      setUserBalance(profileData.balances || {});
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
    } finally {
      setRefreshing(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Render cryptocurrency price item
  const renderPriceItem = (crypto: CryptoPrice) => {
    const isPriceUp = crypto.priceChangePercentage24h >= 0;
    
    return (
      <View key={crypto.id} style={styles.cryptoItem}>
        <View style={styles.cryptoHeader}>
          <Text style={styles.cryptoSymbol}>{crypto.symbol.toUpperCase()}</Text>
          <Text style={styles.cryptoName}>{crypto.name}</Text>
        </View>
        
        <View style={styles.cryptoPriceContainer}>
          <Text style={styles.cryptoPrice}>${crypto.currentPrice.toFixed(2)}</Text>
          <Text style={[
            styles.cryptoChange,
            isPriceUp ? styles.priceUp : styles.priceDown,
          ]}>
            {isPriceUp ? '+' : ''}{crypto.priceChangePercentage24h.toFixed(2)}%
          </Text>
        </View>
      </View>
    );
  };

  // Calculate total portfolio value
  const calculateTotalValue = () => {
    let total = 0;
    
    Object.entries(userBalance).forEach(([symbol, amount]) => {
      const crypto = cryptoPrices.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());
      if (crypto) {
        total += crypto.currentPrice * amount;
      }
    });
    
    return total.toFixed(2);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, {user?.username}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Portfolio Summary */}
        <View style={styles.portfolioCard}>
          <Text style={styles.cardTitle}>Your Portfolio</Text>
          <Text style={styles.portfolioValue}>${calculateTotalValue()}</Text>
          
          <View style={styles.balancesContainer}>
            {Object.entries(userBalance).map(([symbol, amount]) => (
              <View key={symbol} style={styles.balanceItem}>
                <Text style={styles.balanceSymbol}>{symbol.toUpperCase()}</Text>
                <Text style={styles.balanceAmount}>{amount.toFixed(6)}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* Market Prices */}
        <View style={styles.marketCard}>
          <Text style={styles.cardTitle}>Market Prices</Text>
          
          {cryptoPrices.length > 0 ? (
            cryptoPrices.map(renderPriceItem)
          ) : (
            <Text style={styles.noDataText}>No price data available</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#050A30',
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  portfolioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#050A30',
    marginBottom: 12,
  },
  portfolioValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#050A30',
    marginBottom: 20,
  },
  balancesContainer: {
    marginTop: 8,
  },
  balanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  balanceSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#050A30',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  marketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cryptoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cryptoHeader: {
    flex: 1,
  },
  cryptoSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#050A30',
  },
  cryptoName: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  cryptoPriceContainer: {
    alignItems: 'flex-end',
  },
  cryptoPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  cryptoChange: {
    fontSize: 14,
    marginTop: 2,
  },
  priceUp: {
    color: '#34C759',
  },
  priceDown: {
    color: '#FF3B30',
  },
  noDataText: {
    textAlign: 'center',
    color: '#666666',
    marginVertical: 20,
  },
});

export default DashboardScreen;