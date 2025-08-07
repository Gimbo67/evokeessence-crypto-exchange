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

const EmployeeDashboardScreen = () => {
  const { userData, logout } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState({
    totalClients: 0,
    pendingVerifications: 0,
    completedToday: 0
  });

  // Fetch employee dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get employee dashboard data
      const dashboardResponse = await apiClient.getEmployeeDashboard();
      
      // Get clients data
      const clientsResponse = await apiClient.getClients();
      
      setStats(dashboardResponse.stats);
      setClients(clientsResponse.clients || []);
    } catch (error) {
      console.error('Error fetching employee dashboard:', error);
      Alert.alert('Error', 'Failed to load employee dashboard data');
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

  // Handle client selection
  const handleClientSelect = (client) => {
    Alert.alert(
      'Client Details',
      `View details for ${client.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'View Details', 
          onPress: () => console.log('Navigate to client details:', client.id) 
        },
      ]
    );
  };

  // Render client item
  const renderClientItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.clientItem}
      onPress={() => handleClientSelect(item)}
    >
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.username}</Text>
        <Text style={styles.clientEmail}>{item.email}</Text>
      </View>
      <View style={styles.clientStatus}>
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
        <Text style={styles.clientDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
    </TouchableOpacity>
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
          <Text style={styles.loadingText}>Loading employee dashboard...</Text>
        </View>
      ) : (
        <>
          {/* Employee Header */}
          <View style={styles.headerSection}>
            <View>
              <Text style={styles.headerText}>Employee Dashboard</Text>
              <Text style={styles.subHeaderText}>
                Welcome back, {userData?.username}
              </Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Statistics Card */}
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>Client Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalClients}</Text>
                <Text style={styles.statLabel}>Total Clients</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.pendingVerifications}</Text>
                <Text style={styles.statLabel}>Pending Verifications</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.completedToday}</Text>
                <Text style={styles.statLabel}>Completed Today</Text>
              </View>
            </View>
          </View>

          {/* Client List Card */}
          <View style={styles.clientsCard}>
            <Text style={styles.sectionTitle}>Your Clients</Text>
            {clients.length > 0 ? (
              <FlatList
                data={clients}
                renderItem={renderClientItem}
                keyExtractor={item => item.id}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.noDataText}>No clients assigned to you yet</Text>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('Verification Queue', 'This would open the verification queue')}
              >
                <Text style={styles.actionButtonText}>Verification Queue</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('Support Tickets', 'This would open support tickets')}
              >
                <Text style={styles.actionButtonText}>Support Tickets</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('Daily Tasks', 'This would show your daily tasks')}
              >
                <Text style={styles.actionButtonText}>Daily Tasks</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => Alert.alert('Activity Log', 'This would show your activity log')}
              >
                <Text style={styles.actionButtonText}>Activity Log</Text>
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
  subHeaderText: {
    fontSize: 14,
    color: '#E0E0E0',
    marginTop: 4,
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
    width: '31%',
    backgroundColor: '#F5F7FA',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#050A30',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  clientsCard: {
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
  clientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  clientInfo: {
    flex: 2,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  clientEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  clientStatus: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clientDate: {
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

export default EmployeeDashboardScreen;