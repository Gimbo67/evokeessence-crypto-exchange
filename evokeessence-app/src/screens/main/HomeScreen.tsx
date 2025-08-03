import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { Market, Transaction } from '../../types';
import { getMarkets, getRecentTransactions } from '../../services/dataService';

const HomeScreen = () => {
  const { user } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [marketsData, transactionsData] = await Promise.all([
        getMarkets(),
        getRecentTransactions(),
      ]);
      
      setMarkets(marketsData.slice(0, 5)); // Top 5 markets
      setTransactions(transactionsData.slice(0, 3)); // Latest 3 transactions
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const renderMarketItem = (market: Market) => {
    const isPositive = market.change24h >= 0;
    return (
      <TouchableOpacity
        key={market.id}
        style={styles.marketItem}
      >
        <View style={styles.marketItemLeft}>
          <Text style={styles.marketName}>{market.name}</Text>
          <Text style={styles.marketSymbol}>{market.symbol}</Text>
        </View>
        <View style={styles.marketItemRight}>
          <Text style={styles.marketPrice}>{formatCurrency(market.price)}</Text>
          <Text
            style={[
              styles.marketChange,
              isPositive ? styles.positiveChange : styles.negativeChange,
            ]}
          >
            {isPositive ? '+' : ''}{market.change24h.toFixed(2)}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTransactionItem = (transaction: Transaction) => {
    const isDeposit = transaction.type === 'deposit';
    return (
      <View key={transaction.id} style={styles.transactionItem}>
        <View style={styles.transactionIconContainer}>
          <Ionicons
            name={isDeposit ? 'arrow-down-circle' : 'arrow-up-circle'}
            size={24}
            color={isDeposit ? '#4CAF50' : '#F44336'}
          />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionTitle}>
            {isDeposit ? 'Deposit' : 'Withdrawal'} - {transaction.currency}
          </Text>
          <Text style={styles.transactionDate}>
            {new Date(transaction.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.transactionAmount}>
          <Text
            style={[
              styles.transactionAmountText,
              isDeposit ? styles.depositAmount : styles.withdrawalAmount,
            ]}
          >
            {isDeposit ? '+' : '-'}{transaction.amount} {transaction.currency}
          </Text>
          <Text style={styles.transactionStatus}>
            {transaction.status === 'completed' ? 'Completed' : 
             transaction.status === 'pending' ? 'Pending' : 'Failed'}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
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
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.username || 'Trader'}</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceTitle}>Total Balance</Text>
        <Text style={styles.balanceAmount}>$12,345.67</Text>
        <View style={styles.balanceActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="arrow-down" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="arrow-up" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Withdraw</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="swap-horizontal" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Trade</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Markets</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllButton}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.sectionContent}>
          {markets.length > 0 ? (
            markets.map(renderMarketItem)
          ) : (
            <Text style={styles.emptyText}>No market data available</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllButton}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.sectionContent}>
          {transactions.length > 0 ? (
            transactions.map(renderTransactionItem)
          ) : (
            <Text style={styles.emptyText}>No recent transactions</Text>
          )}
        </View>
      </View>

      {user?.isContractor && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Contractor Dashboard</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllButton}>Details</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.contractorCard}>
            <View style={styles.contractorMetric}>
              <Text style={styles.contractorMetricValue}>23</Text>
              <Text style={styles.contractorMetricLabel}>Referrals</Text>
            </View>
            <View style={styles.contractorMetric}>
              <Text style={styles.contractorMetricValue}>$4,582</Text>
              <Text style={styles.contractorMetricLabel}>Volume</Text>
            </View>
            <View style={styles.contractorMetric}>
              <Text style={styles.contractorMetricValue}>$458</Text>
              <Text style={styles.contractorMetricLabel}>Commission</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  balanceCard: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  balanceTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  balanceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllButton: {
    fontSize: 14,
    color: '#0066CC',
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  marketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  marketItemLeft: {
    flex: 1,
  },
  marketName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  marketSymbol: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  marketItemRight: {
    alignItems: 'flex-end',
  },
  marketPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  marketChange: {
    fontSize: 14,
    marginTop: 4,
  },
  positiveChange: {
    color: '#4CAF50',
  },
  negativeChange: {
    color: '#F44336',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionIconContainer: {
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  transactionDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: '600',
  },
  depositAmount: {
    color: '#4CAF50',
  },
  withdrawalAmount: {
    color: '#F44336',
  },
  transactionStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
  },
  contractorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contractorMetric: {
    alignItems: 'center',
    flex: 1,
    padding: 10,
  },
  contractorMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  contractorMetricLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
});

export default HomeScreen;