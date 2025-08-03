import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image
} from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DashboardScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState({
    username: '',
    balance: 0,
    verificationStatus: 'unverified',
    recentDeposits: [],
    recentTransactions: []
  });
  const [marketData, setMarketData] = useState([]);

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/user/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setUserData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchMarketData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/market/prices`);
      if (response.data && response.data.success) {
        setMarketData(response.data.prices.slice(0, 5)); // Get top 5 coins
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchUserData(), fetchMarketData()]);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchUserData(), fetchMarketData()]);
  };

  const handleDeposit = () => {
    navigation.navigate('Deposits');
  };

  const handleWithdraw = () => {
    navigation.navigate('Withdraw');
  };

  const handleVerify = () => {
    navigation.navigate('Verification');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#6200ee']}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.usernameText}>{userData.username}</Text>
      </View>

      <Card style={styles.balanceCard}>
        <View style={styles.balanceCardContent}>
          <View>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceAmount}>€{userData.balance.toFixed(2)}</Text>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleDeposit}
            >
              <Ionicons name="arrow-down" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Deposit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.withdrawButton]}
              onPress={handleWithdraw}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>

      {userData.verificationStatus !== 'verified' && (
        <Card style={styles.verificationCard}>
          <View style={styles.verificationCardContent}>
            <View style={styles.verificationIcon}>
              <Ionicons 
                name={userData.verificationStatus === 'pending' ? 'hourglass' : 'shield-outline'} 
                size={32} 
                color="#ff9800" 
              />
            </View>
            
            <View style={styles.verificationInfo}>
              <Text style={styles.verificationTitle}>
                {userData.verificationStatus === 'pending' 
                  ? 'Verification In Progress' 
                  : 'Account Verification Required'}
              </Text>
              <Text style={styles.verificationText}>
                {userData.verificationStatus === 'pending'
                  ? 'Your verification is being processed. This may take 1-2 business days.'
                  : 'Verify your identity to unlock all features and higher limits.'}
              </Text>
              
              {userData.verificationStatus !== 'pending' && (
                <TouchableOpacity 
                  style={styles.verifyButton}
                  onPress={handleVerify}
                >
                  <Text style={styles.verifyButtonText}>Verify Now</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Card>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Market Trends</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Markets')}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.marketCardsContainer}
        contentContainerStyle={styles.marketCards}
      >
        {marketData.map((coin) => (
          <Card key={coin.id} style={styles.marketCard}>
            <View style={styles.marketCardContent}>
              <View style={styles.coinInfo}>
                <Image
                  source={{ uri: coin.image }}
                  style={styles.coinIcon}
                  defaultSource={require('../../assets/placeholder-coin.png')}
                />
                <View>
                  <Text style={styles.coinName}>{coin.name}</Text>
                  <Text style={styles.coinSymbol}>{coin.symbol.toUpperCase()}</Text>
                </View>
              </View>
              
              <View style={styles.priceInfo}>
                <Text style={styles.coinPrice}>€{coin.current_price.toFixed(2)}</Text>
                <Text style={[
                  styles.priceChange,
                  coin.price_change_percentage_24h >= 0 ? styles.priceUp : styles.priceDown
                ]}>
                  <Ionicons 
                    name={coin.price_change_percentage_24h >= 0 ? 'caret-up' : 'caret-down'} 
                    size={16} 
                  />
                  {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.transactionsContainer}>
        {userData.recentTransactions.length > 0 ? (
          userData.recentTransactions.map((transaction) => (
            <Card key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionCardContent}>
                <View style={styles.transactionIconContainer}>
                  <Ionicons 
                    name={transaction.type === 'deposit' ? 'arrow-down-circle' : 'arrow-up-circle'} 
                    size={32} 
                    color={transaction.type === 'deposit' ? '#4caf50' : '#f44336'} 
                  />
                </View>
                
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>
                    {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={styles.transactionAmount}>
                  <Text style={[
                    styles.amountText,
                    transaction.type === 'deposit' ? styles.depositText : styles.withdrawalText
                  ]}>
                    {transaction.type === 'deposit' ? '+' : '-'}€{transaction.amount.toFixed(2)}
                  </Text>
                  <Text style={styles.transactionStatus}>
                    {transaction.status}
                  </Text>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <View style={styles.emptyTransactions}>
            <Ionicons name="document-text-outline" size={64} color="#bdbdbd" />
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubText}>Your transactions will appear here</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#6200ee',
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  usernameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  balanceCard: {
    marginTop: -20,
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 4,
  },
  balanceCardContent: {
    padding: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#757575',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
  },
  actionButton: {
    backgroundColor: '#6200ee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
  },
  withdrawButton: {
    backgroundColor: '#4a148c',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  verificationCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: '#fff9e6',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  verificationCardContent: {
    padding: 16,
    flexDirection: 'row',
  },
  verificationIcon: {
    marginRight: 16,
    justifyContent: 'center',
  },
  verificationInfo: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  verificationText: {
    fontSize: 14,
    color: '#757575',
  },
  verifyButton: {
    backgroundColor: '#ff9800',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  seeAllText: {
    color: '#6200ee',
    fontWeight: '500',
  },
  marketCardsContainer: {
    marginBottom: 8,
  },
  marketCards: {
    paddingHorizontal: 8,
  },
  marketCard: {
    width: 220,
    marginHorizontal: 8,
    borderRadius: 8,
  },
  marketCardContent: {
    padding: 16,
  },
  coinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  coinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  coinName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  coinSymbol: {
    fontSize: 12,
    color: '#757575',
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinPrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  priceChange: {
    fontSize: 14,
    fontWeight: 'bold',
    padding: 4,
    borderRadius: 4,
  },
  priceUp: {
    color: '#4caf50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  priceDown: {
    color: '#f44336',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  transactionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  transactionCard: {
    marginBottom: 8,
    borderRadius: 8,
  },
  transactionCardContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIconContainer: {
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDate: {
    fontSize: 12,
    color: '#757575',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  depositText: {
    color: '#4caf50',
  },
  withdrawalText: {
    color: '#f44336',
  },
  transactionStatus: {
    fontSize: 12,
    color: '#757575',
    textTransform: 'capitalize',
  },
  emptyTransactions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#757575',
  },
  emptySubText: {
    fontSize: 14,
    color: '#9e9e9e',
    marginTop: 4,
  },
});

export default DashboardScreen;