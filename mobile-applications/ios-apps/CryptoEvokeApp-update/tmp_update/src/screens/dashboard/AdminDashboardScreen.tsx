import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../store/AuthContext';
import { adminApi } from '../../api/apiClient';

// Define user type for admin dashboard
interface UserData {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  role: string;
  createdAt: string;
}

const AdminDashboardScreen = () => {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load users data
  useEffect(() => {
    loadUsers();
  }, []);

  // Function to load users
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers();
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadUsers();
    } finally {
      setRefreshing(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Verify a user
  const handleVerifyUser = async (userId: string) => {
    try {
      await adminApi.verifyUser(userId);
      Alert.alert('Success', 'User has been verified successfully.');
      
      // Update the local state to reflect the change
      setUsers(users.map(u => 
        u.id === userId ? { ...u, isVerified: true } : u
      ));
    } catch (error) {
      console.error('Error verifying user:', error);
      Alert.alert('Error', 'Failed to verify user. Please try again.');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Calculate statistics
  const getTotalClients = () => users.filter(u => u.role === 'client').length;
  const getVerifiedClients = () => users.filter(u => u.role === 'client' && u.isVerified).length;
  const getPendingVerifications = () => users.filter(u => u.role === 'client' && !u.isVerified).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Admin Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{getTotalClients()}</Text>
            <Text style={styles.statLabel}>Total Clients</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{getVerifiedClients()}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{getPendingVerifications()}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
        
        {/* Pending Verifications Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pending Verifications</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color="#0A2896" style={styles.loader} />
          ) : getPendingVerifications() === 0 ? (
            <Text style={styles.noDataText}>No pending verifications</Text>
          ) : (
            users
              .filter(u => u.role === 'client' && !u.isVerified)
              .map(user => (
                <View key={user.id} style={styles.userCard}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {user.firstName} {user.lastName}
                    </Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <Text style={styles.userDetail}>
                      Joined: {formatDate(user.createdAt)}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={() => handleVerifyUser(user.id)}
                  >
                    <Text style={styles.verifyButtonText}>Verify</Text>
                  </TouchableOpacity>
                </View>
              ))
          )}
        </View>
        
        {/* All Users Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>All Users</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color="#0A2896" style={styles.loader} />
          ) : users.length === 0 ? (
            <Text style={styles.noDataText}>No users found</Text>
          ) : (
            users.map(user => (
              <View key={user.id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <View style={styles.userDetailRow}>
                    <Text style={styles.userDetail}>
                      Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Text>
                    <View style={[
                      styles.statusIndicator,
                      user.isVerified ? styles.verifiedIndicator : styles.unverifiedIndicator
                    ]}>
                      <Text style={styles.statusText}>
                        {user.isVerified ? 'Verified' : 'Unverified'}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {!user.isVerified && user.role === 'client' && (
                  <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={() => handleVerifyUser(user.id)}
                  >
                    <Text style={styles.verifyButtonText}>Verify</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#050A30',
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#050A30',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#050A30',
    marginBottom: 16,
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#050A30',
  },
  userEmail: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  userDetail: {
    fontSize: 12,
    color: '#777777',
    marginTop: 2,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedIndicator: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  unverifiedIndicator: {
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: '#0A2896',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  loader: {
    marginVertical: 20,
  },
  noDataText: {
    textAlign: 'center',
    color: '#666666',
    marginVertical: 20,
  },
});

export default AdminDashboardScreen;