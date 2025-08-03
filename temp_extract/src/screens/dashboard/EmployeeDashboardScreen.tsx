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

interface Client {
  id: string;
  username: string;
  email: string;
  isVerified: boolean;
  status: string;
  createdAt: string;
}

interface KYCRequest {
  id: string;
  userId: string;
  username: string;
  status: string;
  submittedAt: string;
}

const EmployeeDashboardScreen = () => {
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [kycRequests, setKYCRequests] = useState<KYCRequest[]>([]);
  const [stats, setStats] = useState({
    pendingKYC: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalClients: 0,
  });

  const fetchDashboardData = async () => {
    try {
      const statsResponse = await apiClient.get('/api/employee/stats');
      setStats(statsResponse.data);
      
      const clientsResponse = await apiClient.get('/api/employee/clients');
      setClients(clientsResponse.data.clients);
      
      const kycResponse = await apiClient.get('/api/employee/kyc-requests');
      setKYCRequests(kycResponse.data.requests);
    } catch (error) {
      console.error('Error fetching employee dashboard data:', error);
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

  const renderClientItem = ({ item }: { item: Client }) => (
    <View style={styles.clientItem}>
      <View>
        <Text style={styles.clientName}>{item.username}</Text>
        <Text style={styles.clientEmail}>{item.email}</Text>
      </View>
      <View style={styles.clientStatus}>
        <Text style={[
          styles.statusText,
          { 
            color: item.status === 'active' ? '#4CAF50' : 
                   item.status === 'pending' ? '#FF9800' : '#F44336'
          }
        ]}>
          {item.status}
        </Text>
      </View>
    </View>
  );

  const renderKYCItem = ({ item }: { item: KYCRequest }) => (
    <View style={styles.kycItem}>
      <View>
        <Text style={styles.kycUser}>{item.username}</Text>
        <Text style={styles.kycDate}>
          Submitted: {new Date(item.submittedAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity 
        style={[
          styles.kycButton,
          { backgroundColor: item.status === 'pending' ? '#2e3f6e' : '#f0f0f0' }
        ]}
        disabled={item.status !== 'pending'}
      >
        <Text style={[
          styles.kycButtonText,
          { color: item.status === 'pending' ? 'white' : '#888' }
        ]}>
          {item.status === 'pending' ? 'Review' : 'Reviewed'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Employee Dashboard</Text>
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
            Welcome, {user?.username || 'Employee'}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Task Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.pendingKYC}</Text>
              <Text style={styles.statLabel}>Pending KYC</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.pendingDeposits}</Text>
              <Text style={styles.statLabel}>Pending Deposits</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.pendingWithdrawals}</Text>
              <Text style={styles.statLabel}>Pending Withdrawals</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalClients}</Text>
              <Text style={styles.statLabel}>Total Clients</Text>
            </View>
          </View>
        </View>

        <View style={styles.kycContainer}>
          <Text style={styles.sectionTitle}>Pending KYC Requests</Text>
          {kycRequests.length > 0 ? (
            <FlatList
              data={kycRequests.filter(req => req.status === 'pending').slice(0, 5)}
              renderItem={renderKYCItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noDataText}>No pending KYC requests</Text>
          )}
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All KYC Requests</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.clientsContainer}>
          <Text style={styles.sectionTitle}>Recent Clients</Text>
          {clients.length > 0 ? (
            <FlatList
              data={clients.slice(0, 5)}
              renderItem={renderClientItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noDataText}>No client data available</Text>
          )}
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All Clients</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>Process KYC</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>Process Deposits</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>Process Withdrawals</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionText}>Client Support</Text>
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
  kycContainer: {
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
  kycItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  kycUser: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  kycDate: {
    fontSize: 14,
    color: '#888',
  },
  kycButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  kycButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  clientsContainer: {
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
  clientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  clientEmail: {
    fontSize: 14,
    color: '#888',
  },
  clientStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
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

export default EmployeeDashboardScreen;
