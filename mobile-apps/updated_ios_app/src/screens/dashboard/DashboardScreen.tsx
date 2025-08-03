import React, { useState, useEffect } from 'react';
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
import apiClient from '../../api/apiClient';

interface CryptoPrice {
  name: string;
  symbol: string;
  price: number;
  change24h: number;
}

const DashboardScreen = () => {
  const { user, logout } = useAuth();
  const [cryptoPrices, setCryptoPrices] = useState<CryptoPrice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [balances, setBalances] = useState({
    btc: 0,
    eth: 0,
    usdt: 0,
    usdc: 0,
  });

  const fetchCryptoPrices = async () => {
    try {
      const response = await apiClient.get('/api/market/prices');
      setCryptoPrices(response.data.prices);
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      Alert.alert('Error', 'Failed to fetch latest crypto prices');
    }
  };

  const fetchUserBalances = async () => {
    try {
      const response = await apiClient.get('/api/user/balances');
      setBalances(response.data.balances);
    } catch (error) {
      console.error('Error fetching user balances:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchCryptoPrices(), fetchUserBalances()]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCryptoPrices();
    fetchUserBalances();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Crypto Evoke Exchange</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            Welcome, {user?.username || 'User'}
          </Text>
          {!user?.isVerified && (
            <View style={styles.verificationAlert}>
              <Text style={styles.verificationText}>
                Your account is not verified. Please complete KYC verification.
              </Text>
              <TouchableOpacity style={styles.verifyButton}>
                <Text style={styles.verifyButtonText}>Verify Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.balancesContainer}>
          <Text style={styles.sectionTitle}>Your Balances</Text>
          <View style={styles.balancesGrid}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>BTC</Text>
              <Text style={styles.balanceValue}>{balances.btc.toFixed(8)}</Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>ETH</Text>
              <Text style={styles.balanceValue}>{balances.eth.toFixed(8)}</Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>USDT</Text>
              <Text style={styles.balanceValue}>{balances.usdt.toFixed(2)}</Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>USDC</Text>
              <Text style={styles.balanceValue}>{balances.usdc.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.pricesContainer}>
          <Text style={styles.sectionTitle}>Market Prices</Text>
          {cryptoPrices.map((crypto, index) => (
            <View key={index} style={styles.priceItem}>
              <View style={styles.symbolContainer}>
                <Text style={styles.symbolText}>{crypto.symbol}</Text>
                <Text style={styles.nameText}>{crypto.name}</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>
                  ${crypto.price.toFixed(2)}
                </Text>
                <Text
                  style={[
                    styles.changeText,
                    { color: crypto.change24h >= 0 ? '#4CAF50' : '#F44336' },
                  ]}
                >
                  {crypto.change24h >= 0 ? '+' : ''}
                  {crypto.change24h.toFixed(2)}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>Deposit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>Buy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>Sell</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2e3f6e',
    paddingVertical: 20,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  logoutText: {
    color: 'white',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  welcomeContainer: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  verificationAlert: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFEEBA',
  },
  verificationText: {
    color: '#856404',
    marginBottom: 10,
  },
  verifyButton: {
    backgroundColor: '#2e3f6e',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  verifyButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  balancesContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  balancesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  balanceItem: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  pricesContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  priceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  symbolContainer: {
    flexDirection: 'column',
  },
  symbolText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  nameText: {
    fontSize: 14,
    color: '#888',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  changeText: {
    fontSize: 14,
  },
  actionsContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#2e3f6e',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default DashboardScreen;
