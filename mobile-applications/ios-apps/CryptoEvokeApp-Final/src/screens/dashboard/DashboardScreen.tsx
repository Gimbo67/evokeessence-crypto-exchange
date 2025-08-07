import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl, 
  SafeAreaView, 
  ActivityIndicator 
} from 'react-native';
import { useAuth } from '../../store/AuthContext';
import { apiClient } from '../../api/apiClient';

interface CryptoData {
  name: string;
  symbol: string;
  price: number;
  change: number;
}

const DashboardScreen = () => {
  const { logout } = useAuth();
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userBalance, setUserBalance] = useState({
    totalBalance: 0,
    availableBalance: 0,
    pendingBalance: 0
  });

  const fetchCryptoData = async () => {
    try {
      const response = await apiClient.get('/api/market/prices');
      setCryptoData(response.data);
    } catch (error) {
      console.error('Error fetching crypto data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const response = await apiClient.get('/api/user/balance');
      setUserBalance(response.data);
    } catch (error) {
      console.error('Error fetching user balance:', error);
    }
  };

  useEffect(() => {
    fetchCryptoData();
    fetchUserBalance();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCryptoData();
    fetchUserBalance();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CryptoEvoke Exchange</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Your Balance</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Total</Text>
              <Text style={styles.balanceValue}>${userBalance.totalBalance.toFixed(2)}</Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Available</Text>
              <Text style={styles.balanceValue}>${userBalance.availableBalance.toFixed(2)}</Text>
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Pending</Text>
              <Text style={styles.balanceValue}>${userBalance.pendingBalance.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Market Overview</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#4a80f5" style={styles.loader} />
        ) : (
          <View style={styles.cryptoList}>
            {cryptoData.map((crypto, index) => (
              <View key={index} style={styles.cryptoItem}>
                <Text style={styles.cryptoName}>{crypto.name} ({crypto.symbol})</Text>
                <Text style={styles.cryptoPrice}>${crypto.price.toFixed(2)}</Text>
                <Text 
                  style={[
                    styles.cryptoChange, 
                    {color: crypto.change >= 0 ? '#4CAF50' : '#F44336'}
                  ]}
                >
                  {crypto.change >= 0 ? '+' : ''}{crypto.change}%
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Buy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Sell</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#4a80f5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4a80f5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 12,
    color: '#333',
  },
  loader: {
    marginVertical: 20,
  },
  cryptoList: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cryptoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cryptoName: {
    flex: 2,
    fontSize: 16,
    fontWeight: '500',
  },
  cryptoPrice: {
    flex: 1,
    fontSize: 16,
    textAlign: 'right',
  },
  cryptoChange: {
    flex: 1,
    fontSize: 16,
    textAlign: 'right',
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4a80f5',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default DashboardScreen;