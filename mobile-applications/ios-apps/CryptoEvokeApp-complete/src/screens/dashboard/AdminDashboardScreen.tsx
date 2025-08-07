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
  FlatList,
} from 'react-native';

import { AuthContext } from '../../store/AuthContext';
import { apiClient } from '../../api/apiClient';

const AdminDashboardScreen = () => {
  const { userData, logout } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    userStats: {
      totalUsers: 0,
      verifiedUsers: 0,
      pendingVerifications: 0,
      registrationsToday: 0,
    },
    systemHealth: {
      serverStatus: 'Online',
      databaseStatus: 'Connected',
      lastBackup: '2023-05-19 05:30 UTC',
      apiPerformance: '98.6%',
    },
    recentUsers: []
  });

  // Fetch admin dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get admin dashboard data
      const response = await apiClient.getAdminDashboard();
      
      setDashboardData(response);
    } catch (error) {
      console.error('Error fetching admin dashboard:', error);
      Alert.alert('Error', 'Failed to load admin dashboard data');
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

  // Render recent user item
  const renderUserItem = ({ item }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.username}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <View style={styles.userStatus}>
        <Text 
          style={[
            styles.statusText, 
            { 
              color: item.isVerified ? '#4CAF50' : 
                     item.verificationStatus === 'pending' ? '#FFC107' : '#F44336' 
            }
          ]}
        >
          {item.isVerified ? 'Verified' : 
           item.verificationStatus === 'pending' ? 'Pending' : 'Unverified'}
        </Text>
        <Text style={styles.userDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
    </View>
  );

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
          <Text style={styles.loadingText}>Loading admin dashboard...</Text>
        </View>
      ) : (
        <>
          {/* Admin Header */}
          <View style={styles.headerSection}>
            <Text style={styles.headerText}>Admin Dashboard</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* User Statistics Card */}
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>User Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{dashboardData.userStats.totalUsers}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{dashboardData.userStats.verifiedUsers}</Text>
                <Text style={styles.statLabel}>Verified Users</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{dashboardData.userStats.pendingVerifications}</Text>
                <Text style={styles.statLabel}>Pending Verifications</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{dashboardData.userStats.registrationsToday}</Text>
                <Text style={styles.statLabel}>Registrations Today</Text>
              </View>
            </View>
          </View>

          {/* System Health Card */}
          <View style={styles.healthCard}>
            <Text style={styles.sectionTitle}>System Health</Text>
            <View style={styles.healthItem}>
              <Text style={styles.healthLabel}>Server Status:</Text>
              <Text style={[
                styles.healthValue,
                {color: dashboardData.systemHealth.serverStatus === 'Online' ? '#4CAF50' : '#F44336'}
              ]}>
                {dashboardData.systemHealth.serverStatus}
              </Text>
            </View>
            <View style={styles.healthItem}>
              <Text style={styles.healthLabel}>Database Status:</Text>
              <Text style={[
                styles.healthValue,
                {color: dashboardData.systemHealth.databaseStatus === 'Connected' ? '#4CAF50' : '#F44336'}
              ]}>
                {dashboardData.systemHealth.databaseStatus}
              </Text>
            </View>
            <View style={styles.healthItem}>
              <Text style={styles.healthLabel}>Last Backup:</Text>
              <Text style={styles.healthValue}>{dashboardData.systemHealth.lastBackup}</Text>
            </View>
            <View style={styles.healthItem}>
              <Text style={styles.healthLabel}>API Performance:</Text>
              <Text style={styles.healthValue}>{dashboardData.systemHealth.apiPerformance}</Text>
            </View>
          </View>

          {/* Recent Users Card */}
          <View style={styles.usersCard}>
            <Text style={styles.sectionTitle}>Recent Users</Text>
            {dashboardData.recentUsers.length > 0 ? (
              <FlatList
                data={dashboardData.recentUsers}
                renderItem={renderUserItem}
                keyExtractor={item => item.id}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.noDataText}>No recent user registrations</Text>
            )}
          </View>

          {/* Admin Actions */}
          <View style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>Administrative Actions</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('User Management', 'This would open the user management screen')}
              >
                <Text style={styles.actionButtonText}>Manage Users</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('Verification Queue', 'This would open the verification queue')}
              >
                <Text style={styles.actionButtonText}>Verification Queue</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('System Settings', 'This would open system settings')}
              >
                <Text style={styles.actionButtonText}>System Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('Activity Logs', 'This would open activity logs')}
              >
                <Text style={styles.actionButtonText}>Activity Logs</Text>
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
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#050A30',
  },
  headerText: {
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
  statsCard: {
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#F5F7FA',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#050A30',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  healthCard: {
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
  healthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  healthLabel: {
    fontSize: 16,
    color: '#444',
  },
  healthValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  usersCard: {
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
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 20,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  userInfo: {
    flex: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  userStatus: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  userDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
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
    fontSize: 14,
    color: '#050A30',
    fontWeight: '500',
  },
});

export default AdminDashboardScreen;