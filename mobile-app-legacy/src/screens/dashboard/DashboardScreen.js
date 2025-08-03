import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/apiClient';
import TransakWidget from '../../components/TransakWidget';

const DashboardScreen = ({ navigation }) => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marketData, setMarketData] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  const [transakVisible, setTransakVisible] = useState(false);

  // Format currency amount
  const formatCurrency = (amount, currency = 'USD') => {
    return `${parseFloat(amount).toFixed(2)} ${currency}`;
  };

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      // Fetch market prices
      const prices = await apiClient.market.getPrices();
      setMarketData(prices.slice(0, 5)); // Show top 5 cryptocurrencies

      // Fetch user transactions if authenticated
      if (user) {
        try {
          const userTransactions = await apiClient.user.getTransactions();
          setTransactions(userTransactions.slice(0, 5)); // Show latest 5 transactions
        } catch (error) {
          console.error('Error fetching transactions:', error);
          // Don't fail if transactions can't be loaded
        }

        // Refresh user data
        await refreshUser();
      }
      
      setError(null);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load some dashboard data. Pull down to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Initial data loading
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Determine verification status
  const isVerified = user?.kycStatus === 'approved' || 
                    user?.kycStatus === 'complete' || 
                    user?.kycStatus === 'verified';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6200ee" />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : (
          <>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.balanceCard}>
              <Text style={styles.welcomeText}>
                Welcome, {user?.username || 'User'}
              </Text>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Available Balance:</Text>
                <Text style={styles.balanceValue}>
                  {formatCurrency(user?.balance || '0', user?.balanceCurrency || 'USD')}
                </Text>
              </View>
              <View style={styles.kycStatusContainer}>
                <Text style={styles.kycStatusLabel}>KYC Status:</Text>
                <Text style={[
                  styles.kycStatusValue,
                  isVerified ? styles.verifiedStatus : styles.pendingStatus
                ]}>
                  {(user?.kycStatus || 'not_started').replace('_', ' ').toUpperCase()}
                </Text>
              </View>

              {!isVerified && (
                <TouchableOpacity 
                  style={styles.verifyButton}
                  onPress={() => {
                    // Handle KYC verification start
                    Alert.alert(
                      'Begin Verification',
                      'You will be redirected to complete your KYC verification process.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Continue', 
                          onPress: async () => {
                            try {
                              const result = await apiClient.user.startKyc();
                              if (result && result.url) {
                                // In a real app, this would open a WebView or browser
                                Alert.alert('Verification Started', 'Please complete your verification process.');
                              }
                            } catch (error) {
                              Alert.alert('Error', 'Could not start verification process. Please try again later.');
                            }
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.verifyButtonText}>
                    {user?.kycStatus === 'not_started' ? 'Start Verification' : 'Complete Verification'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Market Overview</Text>
              <TouchableOpacity 
                style={styles.seeAllButton}
                onPress={() => navigation.navigate('Markets')}
              >
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>

            {marketData.length > 0 ? (
              <View style={styles.marketContainer}>
                {marketData.map((coin, index) => (
                  <View key={`${coin.id}-${index}`} style={styles.coinItem}>
                    <View style={styles.coinInfo}>
                      <Text style={styles.coinName}>{coin.name}</Text>
                      <Text style={styles.coinSymbol}>{coin.symbol.toUpperCase()}</Text>
                    </View>
                    <View style={styles.coinPriceContainer}>
                      <Text style={styles.coinPrice}>
                        ${parseFloat(coin.price).toFixed(2)}
                      </Text>
                      <Text style={[
                        styles.priceChange,
                        parseFloat(coin.change24h) >= 0 ? styles.priceIncrease : styles.priceDecrease
                      ]}>
                        {parseFloat(coin.change24h) >= 0 ? '+' : ''}
                        {parseFloat(coin.change24h).toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>Market data is currently unavailable</Text>
              </View>
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Deposits')}
              >
                <Ionicons name="cash-outline" size={24} color="#6200ee" />
                <Text style={styles.actionText}>Deposit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setTransakVisible(true)}
              >
                <Ionicons name="card-outline" size={24} color="#6200ee" />
                <Text style={styles.actionText}>Buy Crypto</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <Ionicons name="person-outline" size={24} color="#6200ee" />
                <Text style={styles.actionText}>Profile</Text>
              </TouchableOpacity>
            </View>

            {user && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Transactions</Text>
                  <TouchableOpacity 
                    style={styles.seeAllButton}
                    onPress={() => {
                      // Navigate to transactions screen if implemented
                      Alert.alert('Coming Soon', 'Full transaction history will be available soon.');
                    }}
                  >
                    <Text style={styles.seeAllText}>See All</Text>
                  </TouchableOpacity>
                </View>

                {transactions.length > 0 ? (
                  <View style={styles.transactionsContainer}>
                    {transactions.map((transaction, index) => (
                      <View key={`${transaction.id}-${index}`} style={styles.transactionItem}>
                        <View style={styles.transactionInfo}>
                          <Text style={styles.transactionType}>
                            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          </Text>
                          <Text style={styles.transactionDate}>
                            {new Date(transaction.date).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={[
                          styles.transactionAmount,
                          transaction.type === 'deposit' ? styles.depositAmount : styles.withdrawalAmount
                        ]}>
                          {transaction.type === 'deposit' ? '+' : '-'}
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>No recent transactions</Text>
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
      
      {/* Transak Widget Modal */}
      <TransakWidget 
        visible={transakVisible} 
        onClose={() => setTransakVisible(false)} 
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  kycStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  kycStatusLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  kycStatusValue: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  verifiedStatus: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  pendingStatus: {
    backgroundColor: '#fff8e1',
    color: '#ff8f00',
  },
  verifyButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllButton: {
    padding: 4,
  },
  seeAllText: {
    color: '#6200ee',
    fontSize: 14,
  },
  marketContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coinItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  coinInfo: {
    flex: 1,
  },
  coinName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  coinSymbol: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  coinPriceContainer: {
    alignItems: 'flex-end',
  },
  coinPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  priceChange: {
    fontSize: 14,
    marginTop: 4,
  },
  priceIncrease: {
    color: '#4caf50',
  },
  priceDecrease: {
    color: '#f44336',
  },
  noDataContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noDataText: {
    color: '#666',
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    color: '#333',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  transactionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  depositAmount: {
    color: '#4caf50',
  },
  withdrawalAmount: {
    color: '#f44336',
  },
});

export default DashboardScreen;