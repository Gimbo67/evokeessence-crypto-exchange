import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/apiClient';

const AdminDashboardScreen = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'employees'
  const [error, setError] = useState(null);

  // Format currency amount
  const formatCurrency = (amount, currency = 'USD') => {
    return `${parseFloat(amount).toFixed(2)} ${currency}`;
  };

  // Load admin data
  const loadAdminData = async () => {
    try {
      // Fetch admin analytics
      const analyticsData = await apiClient.admin.getAnalytics();
      setAnalytics(analyticsData);

      // Fetch users if on users tab
      if (activeTab === 'users' || activeTab === 'overview') {
        const usersData = await apiClient.admin.getUsers();
        setUsers(usersData);
      }

      // Fetch employees if on employees tab
      if (activeTab === 'employees' || activeTab === 'overview') {
        const employeesData = await apiClient.admin.getEmployees();
        setEmployees(employeesData);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error loading admin data:', error);
      setError('Failed to load admin data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadAdminData();
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (!loading && !refreshing) {
      loadAdminData();
    }
  };

  // Initial data loading
  useEffect(() => {
    loadAdminData();
  }, []);

  // Render user item
  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => {
        Alert.alert(
          `User: ${item.username}`,
          `Email: ${item.email}\nStatus: ${item.status || 'Active'}\nKYC: ${item.kyc_status || 'Not Started'}`
        );
      }}
    >
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.userStatus}>
        <Text style={[
          styles.statusText,
          item.kyc_status === 'approved' ? styles.approvedStatus : 
          item.kyc_status === 'pending' ? styles.pendingStatus : 
          styles.notStartedStatus
        ]}>
          {(item.kyc_status || 'Not Started').toUpperCase()}
        </Text>
        <Text style={styles.userDate}>
          Joined: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#999" />
    </TouchableOpacity>
  );

  // Render employee item
  const renderEmployeeItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.employeeItem}
      onPress={() => {
        Alert.alert(
          `Employee: ${item.username}`,
          `Email: ${item.email}\nRole: ${item.role || 'Support'}\nStatus: ${item.status || 'Active'}`
        );
      }}
    >
      <View style={styles.employeeInfo}>
        <Text style={styles.employeeName}>{item.username}</Text>
        <Text style={styles.employeeRole}>{item.role || 'Support'}</Text>
      </View>
      <View style={styles.employeeStatus}>
        <Text style={[
          styles.employeeStatusText,
          item.status === 'active' ? styles.activeStatus : styles.inactiveStatus
        ]}>
          {(item.status || 'Active').toUpperCase()}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#999" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'overview' && styles.activeTabButton]}
          onPress={() => handleTabChange('overview')}
        >
          <Text 
            style={[
              styles.tabButtonText, 
              activeTab === 'overview' && styles.activeTabButtonText
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'users' && styles.activeTabButton]}
          onPress={() => handleTabChange('users')}
        >
          <Text 
            style={[
              styles.tabButtonText, 
              activeTab === 'users' && styles.activeTabButtonText
            ]}
          >
            Users
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'employees' && styles.activeTabButton]}
          onPress={() => handleTabChange('employees')}
        >
          <Text 
            style={[
              styles.tabButtonText, 
              activeTab === 'employees' && styles.activeTabButtonText
            ]}
          >
            Employees
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading admin data...</Text>
        </View>
      ) : (
        <>
          {activeTab === 'overview' && (
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
            >
              {analytics && (
                <>
                  <View style={styles.analyticsCard}>
                    <Text style={styles.cardTitle}>Platform Statistics</Text>
                    
                    <View style={styles.statRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{analytics.totalUsers || 0}</Text>
                        <Text style={styles.statLabel}>Total Users</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{analytics.activeUsers || 0}</Text>
                        <Text style={styles.statLabel}>Active Users</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{analytics.verifiedUsers || 0}</Text>
                        <Text style={styles.statLabel}>Verified Users</Text>
                      </View>
                    </View>
                    
                    <View style={styles.statRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {formatCurrency(analytics.totalDeposits || 0)}
                        </Text>
                        <Text style={styles.statLabel}>Total Deposits</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {formatCurrency(analytics.totalVolume || 0)}
                        </Text>
                        <Text style={styles.statLabel}>Trading Volume</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>
                          {formatCurrency(analytics.totalRevenue || 0)}
                        </Text>
                        <Text style={styles.statLabel}>Total Revenue</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.timeframeCard}>
                    <Text style={styles.cardTitle}>Time Period Analysis</Text>
                    
                    <View style={styles.timeframeItem}>
                      <Text style={styles.timeframeLabel}>Today</Text>
                      <View style={styles.timeframeData}>
                        <Text style={styles.timeframeValue}>
                          {analytics.newUsersToday || 0} new users
                        </Text>
                        <Text style={styles.timeframeValue}>
                          {formatCurrency(analytics.depositToday || 0)} deposits
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.timeframeItem}>
                      <Text style={styles.timeframeLabel}>This Week</Text>
                      <View style={styles.timeframeData}>
                        <Text style={styles.timeframeValue}>
                          {analytics.newUsersThisWeek || 0} new users
                        </Text>
                        <Text style={styles.timeframeValue}>
                          {formatCurrency(analytics.depositThisWeek || 0)} deposits
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.timeframeItem}>
                      <Text style={styles.timeframeLabel}>This Month</Text>
                      <View style={styles.timeframeData}>
                        <Text style={styles.timeframeValue}>
                          {analytics.newUsersThisMonth || 0} new users
                        </Text>
                        <Text style={styles.timeframeValue}>
                          {formatCurrency(analytics.depositThisMonth || 0)} deposits
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.kycCard}>
                    <Text style={styles.cardTitle}>KYC Status</Text>
                    
                    <View style={styles.kycRow}>
                      <View style={styles.kycItem}>
                        <Text style={styles.kycValue}>{analytics.pendingKyc || 0}</Text>
                        <Text style={styles.kycLabel}>Pending</Text>
                      </View>
                      <View style={styles.kycItem}>
                        <Text style={styles.kycValue}>{analytics.approvedKyc || 0}</Text>
                        <Text style={styles.kycLabel}>Approved</Text>
                      </View>
                      <View style={styles.kycItem}>
                        <Text style={styles.kycValue}>{analytics.rejectedKyc || 0}</Text>
                        <Text style={styles.kycLabel}>Rejected</Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.viewAllButton}
                      onPress={() => handleTabChange('users')}
                    >
                      <Text style={styles.viewAllButtonText}>View All Users</Text>
                    </TouchableOpacity>
                  </View>

                  {users.length > 0 && (
                    <View style={styles.recentUsersCard}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Recent Users</Text>
                        <TouchableOpacity onPress={() => handleTabChange('users')}>
                          <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                      </View>
                      
                      {users.slice(0, 3).map((user, index) => (
                        <View key={index} style={styles.recentUserItem}>
                          <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user.username}</Text>
                            <Text style={styles.userEmail}>{user.email}</Text>
                          </View>
                          <Text style={[
                            styles.statusText,
                            user.kyc_status === 'approved' ? styles.approvedStatus : 
                            user.kyc_status === 'pending' ? styles.pendingStatus : 
                            styles.notStartedStatus
                          ]}>
                            {(user.kyc_status || 'Not Started').toUpperCase()}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          )}

          {activeTab === 'users' && (
            <FlatList
              data={users}
              renderItem={renderUserItem}
              keyExtractor={(item, index) => `user-${item.id || index}`}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              }
            />
          )}

          {activeTab === 'employees' && (
            <FlatList
              data={employees}
              renderItem={renderEmployeeItem}
              keyExtractor={(item, index) => `employee-${item.id || index}`}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No employees found</Text>
                </View>
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#6200ee',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#6200ee',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabButtonText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 16,
  },
  listContainer: {
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
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  analyticsCard: {
    backgroundColor: '#fff',
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
    color: '#333',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  timeframeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeframeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  timeframeLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  timeframeData: {
    flex: 2,
    alignItems: 'flex-end',
  },
  timeframeValue: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  kycCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  kycRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kycItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 3,
  },
  kycValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  kycLabel: {
    fontSize: 12,
    color: '#666',
  },
  viewAllButton: {
    backgroundColor: '#f0e6ff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllButtonText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  recentUsersCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    color: '#6200ee',
    fontSize: 14,
  },
  recentUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  userStatus: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  approvedStatus: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  pendingStatus: {
    backgroundColor: '#fff8e1',
    color: '#ff8f00',
  },
  notStartedStatus: {
    backgroundColor: '#f5f5f5',
    color: '#757575',
  },
  userDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  employeeRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  employeeStatus: {
    marginRight: 8,
  },
  employeeStatusText: {
    fontWeight: 'bold',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  activeStatus: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  inactiveStatus: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default AdminDashboardScreen;