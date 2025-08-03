import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import { useAuth } from '../../store/AuthContext';
import apiClient from '../../api/apiClient';

interface User {
  id: string;
  username: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  userId: string;
  username: string;
  timestamp: string;
}

const AdminDashboardScreen = () => {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
  });

  const fetchDashboardData = async () => {
    try {
      const statsResponse = await apiClient.get('/api/admin/stats');
      setStats(statsResponse.data);
      
      const usersResponse = await apiClient.get('/api/admin/users');
      setUsers(usersResponse.data.users);
      
      const transactionsResponse = await apiClient.get('/api/admin/transactions');
      setTransactions(transactionsResponse.data.transactions);
    } catch (error) {
      console.error('Error fetching admin dashboard data:', error);
      Alert.alert('Error', 'Failed to fetch dashboard data');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDashboardData();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      <View>
        <Text style={styles.userName}>{item.username}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.userStatus}>
        <Text style={[
          styles.statusText,
          { color: item.isVerified ? '#4CAF50' : '#F44336' }
        ]}>
          {item.isVerified ? 'Verified' : 'Unverified'}
        </Text>
      </View>
    </View>
  );

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionHeader}>
        <Text style={styles.transactionType}>{item.type}</Text>
        <Text style={[
          styles.transactionStatus,
          { 
            color: item.status === 'completed' ? '#4CAF50' : 
                   item.status === 'pending' ? '#FF9800' : '#F44336'
          }
        ]}>
          {item.status}
        </Text>
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionUser}>{item.username}</Text>
        <Text style={styles.transactionAmount}>
          {item.type === 'deposit' ? '+' : '-'}{item.amount} {item.currency}
        </Text>
      </View>
      <Text style={styles.transactionDate}>
        {new Date(item.timestamp).toLocaleString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
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
            Welcome, {user?.username || 'Admin'}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Platform Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.verifiedUsers}</Text>
              <Text style={styles.statLabel}>Verified Users</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalDeposits}</Text>
              <Text style={styles.statLabel}>Total Deposits</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalWithdrawals}</Text>
              <Text style={styles.statLabel}>Total Withdrawals</Text>
            </View>
          </View>
        </View>

        <View style={styles.usersContainer}>
          <Text style={styles.sectionTitle}>Recent Users</Text>
          {users.length > 0 ? (
            <FlatList
              data={users.slice(0, 5)}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noDataText}>No user data available</Text>
          )}
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All Users</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {transactions.length > 0 ? (
            <FlatList
              data={transactions.slice(0, 5)}
              renderItem={renderTransactionItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noDataText}>No transaction data available</Text>
          )}
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All Transactions</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Admin Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>Manage Users</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>KYC Approvals</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>Transactions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>System Settings</Text>
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsContainer: {
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e3f6e',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  usersContainer: {
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
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
  },
  userStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  transactionsContainer: {
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
  transactionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'capitalize',
  },
  transactionStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  transactionUser: {
    fontSize: 14,
    color: '#888',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  transactionDate: {
    fontSize: 12,
    color: '#aaa',
  },
  noDataText: {
    textAlign: 'center',
    color: '#888',
    padding: 15,
  },
  viewAllButton: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#2e3f6e',
    fontWeight: 'bold',
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

export default AdminDashboardScreen;
