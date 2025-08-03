import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

interface AdminStat {
  title: string;
  value: string | number;
  percentChange: number;
  icon: React.ReactNode;
}

interface User {
  id: number;
  username: string;
  email: string;
  status: 'active' | 'pending' | 'suspended';
  type: 'client' | 'contractor' | 'employee' | 'admin';
  createdAt: string;
}

interface Transaction {
  id: number;
  userId: number;
  username: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

const AdminDashboardScreen = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'transactions' | 'settings'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);

  // Mock data to demonstrate UI layout - would be replaced with API calls
  const fetchDashboardData = () => {
    setIsLoading(true);
    
    // Simulating API delay
    setTimeout(() => {
      // Sample users
      const sampleUsers: User[] = [
        {
          id: 1,
          username: 'johndoe',
          email: 'john.doe@example.com',
          status: 'active',
          type: 'client',
          createdAt: '2025-04-15T10:30:00Z',
        },
        {
          id: 2,
          username: 'janedoe',
          email: 'jane.doe@example.com',
          status: 'active',
          type: 'contractor',
          createdAt: '2025-04-16T11:45:00Z',
        },
        {
          id: 3,
          username: 'alicesmith',
          email: 'alice.smith@example.com',
          status: 'pending',
          type: 'client',
          createdAt: '2025-05-10T09:20:00Z',
        },
        {
          id: 4,
          username: 'bobmartin',
          email: 'bob.martin@example.com',
          status: 'suspended',
          type: 'client',
          createdAt: '2025-05-12T14:10:00Z',
        },
        {
          id: 5,
          username: 'carolwhite',
          email: 'carol.white@example.com',
          status: 'active',
          type: 'employee',
          createdAt: '2025-05-18T08:30:00Z',
        },
      ];

      // Sample transactions
      const sampleTransactions: Transaction[] = [
        {
          id: 101,
          userId: 1,
          username: 'johndoe',
          type: 'deposit',
          amount: 2500,
          currency: 'USDC',
          status: 'completed',
          createdAt: '2025-05-19T15:30:00Z',
        },
        {
          id: 102,
          userId: 2,
          username: 'janedoe',
          type: 'withdrawal',
          amount: 1200,
          currency: 'USDT',
          status: 'pending',
          createdAt: '2025-05-19T16:15:00Z',
        },
        {
          id: 103,
          userId: 3,
          username: 'alicesmith',
          type: 'deposit',
          amount: 500,
          currency: 'BTC',
          status: 'completed',
          createdAt: '2025-05-19T17:10:00Z',
        },
        {
          id: 104,
          userId: 1,
          username: 'johndoe',
          type: 'withdrawal',
          amount: 300,
          currency: 'ETH',
          status: 'failed',
          createdAt: '2025-05-19T18:00:00Z',
        },
        {
          id: 105,
          userId: 4,
          username: 'bobmartin',
          type: 'deposit',
          amount: 1000,
          currency: 'USDC',
          status: 'completed',
          createdAt: '2025-05-20T10:30:00Z',
        },
      ];

      setUsers(sampleUsers);
      setFilteredUsers(sampleUsers);
      setTransactions(sampleTransactions);
      setFilteredTransactions(sampleTransactions);
      setIsLoading(false);
      setRefreshing(false);
    }, 1500);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      
      // Filter users
      const filteredUserResults = users.filter(
        (user) =>
          user.username.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
      setFilteredUsers(filteredUserResults);
      
      // Filter transactions
      const filteredTransactionResults = transactions.filter(
        (transaction) =>
          transaction.username.toLowerCase().includes(query) ||
          transaction.type.toLowerCase().includes(query) ||
          transaction.currency.toLowerCase().includes(query) ||
          transaction.status.toLowerCase().includes(query)
      );
      setFilteredTransactions(filteredTransactionResults);
    } else {
      setFilteredUsers(users);
      setFilteredTransactions(transactions);
    }
  }, [searchQuery, users, transactions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleUserAction = (userId: number, action: 'verify' | 'suspend' | 'delete') => {
    // In a real app, these would make API calls
    switch (action) {
      case 'verify':
        alert(`User ${userId} verification approved`);
        break;
      case 'suspend':
        alert(`User ${userId} has been suspended`);
        break;
      case 'delete':
        alert(`User ${userId} has been deleted`);
        break;
      default:
        break;
    }
  };

  const handleTransactionAction = (transactionId: number, action: 'approve' | 'reject') => {
    // In a real app, these would make API calls
    switch (action) {
      case 'approve':
        alert(`Transaction ${transactionId} has been approved`);
        break;
      case 'reject':
        alert(`Transaction ${transactionId} has been rejected`);
        break;
      default:
        break;
    }
  };

  // Stats cards for overview
  const getAdminStats = (): AdminStat[] => {
    return [
      {
        title: 'Total Users',
        value: users.length,
        percentChange: 12.5,
        icon: <Ionicons name="people" size={24} color="#0066CC" />,
      },
      {
        title: 'New Users (Today)',
        value: 7,
        percentChange: 25.0,
        icon: <Ionicons name="person-add" size={24} color="#4CAF50" />,
      },
      {
        title: 'Transaction Volume',
        value: formatCurrency(5500),
        percentChange: -3.2,
        icon: <Ionicons name="trending-up" size={24} color="#FFA000" />,
      },
      {
        title: 'Pending Verifications',
        value: 12,
        percentChange: 8.5,
        icon: <Ionicons name="shield-checkmark" size={24} color="#FF5722" />,
      },
    ];
  };

  const renderOverviewTab = () => {
    const stats = getAdminStats();

    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Dashboard Overview</Text>
        
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={styles.statCardInner}>
                <View style={styles.statHeader}>
                  {stat.icon}
                  <Text style={styles.statTitle}>{stat.title}</Text>
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <View style={styles.statFooter}>
                  <Text
                    style={[
                      styles.statChange,
                      stat.percentChange >= 0 ? styles.positiveChange : styles.negativeChange,
                    ]}
                  >
                    {stat.percentChange >= 0 ? '↑' : '↓'} {Math.abs(stat.percentChange)}%
                  </Text>
                  <Text style={styles.statPeriod}>vs last week</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="person-add" size={24} color="#0066CC" />
              <Text style={styles.quickActionText}>Add User</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="shield-checkmark" size={24} color="#0066CC" />
              <Text style={styles.quickActionText}>Verify User</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="analytics" size={24} color="#0066CC" />
              <Text style={styles.quickActionText}>View Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="settings" size={24} color="#0066CC" />
              <Text style={styles.quickActionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.recentContainer}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => setActiveTab('transactions')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {transactions.slice(0, 3).map((transaction) => (
            <View key={transaction.id} style={styles.recentItem}>
              <View style={styles.recentItemIcon}>
                <Ionicons
                  name={transaction.type === 'deposit' ? 'arrow-down' : 'arrow-up'}
                  size={20}
                  color={
                    transaction.type === 'deposit' ? '#4CAF50' : '#F44336'
                  }
                />
              </View>
              <View style={styles.recentItemContent}>
                <Text style={styles.recentItemTitle}>
                  {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} - {transaction.username}
                </Text>
                <Text style={styles.recentItemSubtitle}>
                  {formatDate(transaction.createdAt)}
                </Text>
              </View>
              <Text
                style={[
                  styles.recentItemAmount,
                  transaction.type === 'deposit'
                    ? styles.depositAmount
                    : styles.withdrawalAmount,
                ]}
              >
                {transaction.type === 'deposit' ? '+' : '-'}
                {transaction.amount} {transaction.currency}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderUsersTab = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>User Management</Text>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {filteredUsers.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {user.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{user.username}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={styles.userMetaInfo}>
                  <View 
                    style={[
                      styles.statusBadge,
                      user.status === 'active' ? styles.activeBadge :
                      user.status === 'pending' ? styles.pendingBadge :
                      styles.suspendedBadge
                    ]}
                  >
                    <Text style={styles.statusText}>{user.status}</Text>
                  </View>
                  <Text style={styles.userType}>{user.type}</Text>
                  <Text style={styles.userCreatedAt}>
                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.userActions}>
              {user.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.userActionButton, styles.verifyButton]}
                  onPress={() => handleUserAction(user.id, 'verify')}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.userActionText}>Verify</Text>
                </TouchableOpacity>
              )}
              {user.status !== 'suspended' && (
                <TouchableOpacity
                  style={[styles.userActionButton, styles.suspendButton]}
                  onPress={() => handleUserAction(user.id, 'suspend')}
                >
                  <Ionicons name="ban" size={16} color="#fff" />
                  <Text style={styles.userActionText}>Suspend</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.userActionButton, styles.deleteButton]}
                onPress={() => handleUserAction(user.id, 'delete')}
              >
                <Ionicons name="trash" size={16} color="#fff" />
                <Text style={styles.userActionText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredUsers.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        )}
      </View>
    );
  };

  const renderTransactionsTab = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Transaction Management</Text>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {filteredTransactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionCard}>
            <View style={styles.transactionHeader}>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>
                  {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                </Text>
                <View 
                  style={[
                    styles.statusBadge,
                    transaction.status === 'completed' ? styles.completedBadge :
                    transaction.status === 'pending' ? styles.pendingBadge :
                    styles.failedBadge
                  ]}
                >
                  <Text style={styles.statusText}>{transaction.status}</Text>
                </View>
              </View>
              <Text style={styles.transactionId}>ID: {transaction.id}</Text>
            </View>
            
            <View style={styles.transactionDetails}>
              <View style={styles.transactionDetail}>
                <Text style={styles.transactionDetailLabel}>User:</Text>
                <Text style={styles.transactionDetailValue}>{transaction.username}</Text>
              </View>
              <View style={styles.transactionDetail}>
                <Text style={styles.transactionDetailLabel}>Amount:</Text>
                <Text 
                  style={[
                    styles.transactionDetailValue,
                    styles.transactionAmount,
                    transaction.type === 'deposit' ? styles.depositAmount : styles.withdrawalAmount
                  ]}
                >
                  {transaction.type === 'deposit' ? '+' : '-'}{transaction.amount} {transaction.currency}
                </Text>
              </View>
              <View style={styles.transactionDetail}>
                <Text style={styles.transactionDetailLabel}>Date:</Text>
                <Text style={styles.transactionDetailValue}>{formatDate(transaction.createdAt)}</Text>
              </View>
            </View>

            {transaction.status === 'pending' && (
              <View style={styles.transactionActions}>
                <TouchableOpacity
                  style={[styles.transactionActionButton, styles.approveButton]}
                  onPress={() => handleTransactionAction(transaction.id, 'approve')}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.transactionActionText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.transactionActionButton, styles.rejectButton]}
                  onPress={() => handleTransactionAction(transaction.id, 'reject')}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                  <Text style={styles.transactionActionText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {filteredTransactions.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="card" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        )}
      </View>
    );
  };

  const renderSettingsTab = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Admin Settings</Text>
        
        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Security Settings</Text>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="lock-closed" size={22} color="#333" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>Two-Factor Authentication</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="key" size={22} color="#333" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>API Keys Management</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="eye-off" size={22} color="#333" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>Privacy Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>System Settings</Text>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="globe" size={22} color="#333" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>Regional Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="notifications" size={22} color="#333" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>Notification Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="cash" size={22} color="#333" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>Fee Structure</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.settingsSection}>
          <Text style={styles.settingsSectionTitle}>Maintenance</Text>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="shield" size={22} color="#333" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>Security Audit</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingsItem}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="server" size={22} color="#333" style={styles.settingsIcon} />
              <Text style={styles.settingsLabel}>Database Backup</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.settingsItem, styles.dangerItem]}>
            <View style={styles.settingsItemLeft}>
              <Ionicons name="alert-circle" size={22} color="#F44336" style={styles.settingsIcon} />
              <Text style={[styles.settingsLabel, styles.dangerText]}>Maintenance Mode</Text>
            </View>
            <Ionicons name="toggle-outline" size={24} color="#999" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'users':
        return renderUsersTab();
      case 'transactions':
        return renderTransactionsTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return renderOverviewTab();
    }
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderContent()}
      </ScrollView>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'overview' && styles.activeTabButton]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons
            name="home"
            size={22}
            color={activeTab === 'overview' ? '#0066CC' : '#999'}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'overview' && styles.activeTabButtonText,
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'users' && styles.activeTabButton]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons
            name="people"
            size={22}
            color={activeTab === 'users' ? '#0066CC' : '#999'}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'users' && styles.activeTabButtonText,
            ]}
          >
            Users
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'transactions' && styles.activeTabButton]}
          onPress={() => setActiveTab('transactions')}
        >
          <Ionicons
            name="list"
            size={22}
            color={activeTab === 'transactions' ? '#0066CC' : '#999'}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'transactions' && styles.activeTabButtonText,
            ]}
          >
            Transactions
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'settings' && styles.activeTabButton]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons
            name="settings"
            size={22}
            color={activeTab === 'settings' ? '#0066CC' : '#999'}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'settings' && styles.activeTabButtonText,
            ]}
          >
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#0066CC',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 20,
  },
  statCard: {
    width: '50%',
    padding: 5,
  },
  statCardInner: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statChange: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 5,
  },
  positiveChange: {
    color: '#4CAF50',
  },
  negativeChange: {
    color: '#F44336',
  },
  statPeriod: {
    fontSize: 12,
    color: '#999',
  },
  quickActionsContainer: {
    marginBottom: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  quickActionButton: {
    width: '25%',
    padding: 5,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    marginTop: 5,
    textAlign: 'center',
  },
  recentContainer: {
    marginBottom: 20,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllText: {
    fontSize: 14,
    color: '#0066CC',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  recentItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  recentItemContent: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  recentItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  recentItemAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  depositAmount: {
    color: '#4CAF50',
  },
  withdrawalAmount: {
    color: '#F44336',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  userInfo: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  userMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  suspendedBadge: {
    backgroundColor: '#FFEBEE',
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
  },
  failedBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  userType: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  userCreatedAt: {
    fontSize: 14,
    color: '#666',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  userActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  verifyButton: {
    backgroundColor: '#4CAF50',
  },
  suspendButton: {
    backgroundColor: '#FFA000',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  userActionText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 5,
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  transactionId: {
    fontSize: 14,
    color: '#666',
  },
  transactionDetails: {
    marginBottom: 15,
  },
  transactionDetail: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  transactionDetailLabel: {
    width: 80,
    fontSize: 14,
    color: '#666',
  },
  transactionDetailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  transactionAmount: {
    fontWeight: '600',
  },
  transactionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  transactionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  transactionActionText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  settingsSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIcon: {
    marginRight: 15,
  },
  settingsLabel: {
    fontSize: 16,
    color: '#333',
  },
  dangerItem: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: '#F44336',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeTabButton: {
    borderTopWidth: 2,
    borderTopColor: '#0066CC',
  },
  tabButtonText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  activeTabButtonText: {
    color: '#0066CC',
  },
});

export default AdminDashboardScreen;