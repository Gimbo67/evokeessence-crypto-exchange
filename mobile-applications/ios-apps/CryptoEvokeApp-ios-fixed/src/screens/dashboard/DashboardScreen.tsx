import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { AuthContext } from '../../store/AuthContext';
import { apiClient } from '../../api/apiClient';

const DashboardScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [cryptoPrices, setCryptoPrices] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const { userData } = useContext(AuthContext);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get dashboard data
      const dashboardData = await apiClient.getDashboardData();
      setDashboardData(dashboardData);
      
      // Get cryptocurrency prices
      const prices = await apiClient.getCryptoPrices();
      setCryptoPrices(prices);
      
      // Get transactions
      const transactions = await apiClient.getTransactions();
      setTransactions(transactions);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#050A30" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome back, {userData?.username || 'User'}
        </Text>
        <Text style={styles.subtitle}>Your crypto dashboard</Text>
      </View>

      {/* Balance Summary */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceAmount}>
          ${dashboardData?.totalBalance?.toFixed(2) || '0.00'}
        </Text>
        <View style={styles.balanceDetails}>
          <View style={styles.balanceDetailItem}>
            <Text style={styles.balanceDetailLabel}>Available</Text>
            <Text style={styles.balanceDetailValue}>
              ${dashboardData?.availableBalance?.toFixed(2) || '0.00'}
            </Text>
          </View>
          <View style={styles.balanceDetailItem}>
            <Text style={styles.balanceDetailLabel}>Pending</Text>
            <Text style={styles.balanceDetailValue}>
              ${dashboardData?.pendingBalance?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>
      </View>

      {/* Market Prices */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Market Prices</Text>
        {cryptoPrices ? (
          <View style={styles.pricesContainer}>
            {Object.entries(cryptoPrices).map(([coin, data]: [string, any]) => (
              <View key={coin} style={styles.priceCard}>
                <Text style={styles.coinName}>{coin.toUpperCase()}</Text>
                <Text style={styles.coinPrice}>${data.price.toFixed(2)}</Text>
                <Text 
                  style={[
                    styles.coinChange,
                    data.change_24h >= 0 ? styles.positiveChange : styles.negativeChange
                  ]}
                >
                  {data.change_24h >= 0 ? '+' : ''}{data.change_24h.toFixed(2)}%
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noDataText}>No pricing data available</Text>
        )}
      </View>

      {/* Recent Transactions */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.length > 0 ? (
          transactions.map((transaction: any) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionType}>{transaction.type}</Text>
                <Text style={styles.transactionDate}>
                  {new Date(transaction.timestamp).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.transactionAmount}>
                {transaction.amount} {transaction.currency}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No recent transactions</Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Deposit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Withdraw</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Trade</Text>
        </TouchableOpacity>
      </View>
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
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#050A30',
  },
  header: {
    padding: 20,
    backgroundColor: '#050A30',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    marginTop: 4,
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#65656B',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#050A30',
    marginVertical: 10,
  },
  balanceDetails: {
    flexDirection: 'row',
    marginTop: 10,
  },
  balanceDetailItem: {
    flex: 1,
  },
  balanceDetailLabel: {
    fontSize: 14,
    color: '#65656B',
  },
  balanceDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#050A30',
    marginTop: 4,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
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
    marginBottom: 16,
  },
  pricesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  priceCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  coinName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#050A30',
  },
  coinPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#050A30',
    marginVertical: 4,
  },
  coinChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  positiveChange: {
    color: '#10B981',
  },
  negativeChange: {
    color: '#EF4444',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#050A30',
  },
  transactionDate: {
    fontSize: 14,
    color: '#65656B',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#050A30',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#050A30',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 16,
    color: '#65656B',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default DashboardScreen;