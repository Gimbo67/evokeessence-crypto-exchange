import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';

import { AuthContext } from '../../store/AuthContext';
import { apiClient } from '../../api/apiClient';

const DashboardScreen = () => {
  const { userData, logout } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    balances: {
      totalBalance: 0,
      availableBalance: 0,
      pendingBalance: 0,
    },
    recentTransactions: [],
    marketPrices: {
      BTC: { price: 0, change24h: 0 },
      ETH: { price: 0, change24h: 0 },
      USDT: { price: 0, change24h: 0 },
      USDC: { price: 0, change24h: 0 },
    },
  });

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get user dashboard data
      const dashboardResponse = await apiClient.getUserDashboard();
      
      // Get market prices
      const marketResponse = await apiClient.getMarketPrices();
      
      setDashboardData({
        ...dashboardResponse,
        marketPrices: marketResponse.prices || dashboardData.marketPrices,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => logout() },
      ]
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#050A30" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (
        <>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome, {userData?.username}</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Balance Overview */}
          <View style={styles.balanceCard}>
            <Text style={styles.sectionTitle}>Balance Overview</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Total Balance:</Text>
              <Text style={styles.balanceValue}>
                {formatCurrency(dashboardData.balances.totalBalance)}
              </Text>
            </View>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Available Balance:</Text>
              <Text style={styles.balanceValue}>
                {formatCurrency(dashboardData.balances.availableBalance)}
              </Text>
            </View>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Pending Balance:</Text>
              <Text style={styles.balanceValue}>
                {formatCurrency(dashboardData.balances.pendingBalance)}
              </Text>
            </View>
          </View>

          {/* Market Overview */}
          <View style={styles.marketCard}>
            <Text style={styles.sectionTitle}>Market Overview</Text>
            {Object.entries(dashboardData.marketPrices).map(([coin, data]) => (
              <View key={coin} style={styles.marketRow}>
                <Text style={styles.coinName}>{coin}</Text>
                <Text style={styles.coinPrice}>
                  {formatCurrency(data.price)}
                </Text>
                <Text
                  style={[
                    styles.coinChange,
                    { color: data.change24h >= 0 ? '#4CAF50' : '#F44336' },
                  ]}
                >
                  {data.change24h >= 0 ? '+' : ''}
                  {data.change24h.toFixed(2)}%
                </Text>
              </View>
            ))}
          </View>

          {/* Actions Section */}
          <View style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Deposit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Withdraw</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Trade</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>History</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    height: 300,
  },
  loadingText: {
    marginTop: 10,
    color: '#050A30',
    fontSize: 16,
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#050A30',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    margin: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#050A30',
    marginBottom: 15,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#444',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#050A30',
  },
  marketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    margin: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  marketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  coinName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    width: '30%',
  },
  coinPrice: {
    fontSize: 16,
    color: '#333',
    width: '40%',
    textAlign: 'center',
  },
  coinChange: {
    fontSize: 16,
    fontWeight: '500',
    width: '30%',
    textAlign: 'right',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    margin: 16,
    marginTop: 0,
    marginBottom: 30,
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
    backgroundColor: '#F0F2F5',
    width: '48%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#050A30',
    fontWeight: '500',
  },
});

export default DashboardScreen;