import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../../store/AuthContext';
import { apiClient } from '../../api/apiClient';

interface VerificationRequest {
  id: number;
  name: string;
  email: string;
  submissionDate: string;
  documentType: string;
  status: 'pending' | 'approved' | 'rejected';
}

const EmployeeDashboardScreen = () => {
  const { logout } = useAuth();
  const [pendingVerifications, setPendingVerifications] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const fetchPendingVerifications = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/employee/pending-verifications');
      setPendingVerifications(response.data);
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await apiClient.post(`/api/employee/approve-verification/${id}`);
      // Remove the approved item from the list
      setPendingVerifications(currentItems => 
        currentItems.filter(item => item.id !== id)
      );
    } catch (error) {
      console.error('Error approving verification:', error);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await apiClient.post(`/api/employee/reject-verification/${id}`);
      // Remove the rejected item from the list
      setPendingVerifications(currentItems => 
        currentItems.filter(item => item.id !== id)
      );
    } catch (error) {
      console.error('Error rejecting verification:', error);
    }
  };

  const renderVerificationItem = ({ item }: { item: VerificationRequest }) => (
    <View style={styles.verificationItem}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.documentType}>Document: {item.documentType}</Text>
        <Text style={styles.submissionDate}>
          Submitted: {new Date(item.submissionDate).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.verificationActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleApprove(item.id)}
        >
          <Text style={styles.actionButtonText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleReject(item.id)}
        >
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingVerifications();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Employee Dashboard</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.welcomeText}>Welcome, Employee</Text>
        
        <View style={styles.statusSummary}>
          <View style={styles.statusItem}>
            <Text style={styles.statusNumber}>{pendingVerifications.length}</Text>
            <Text style={styles.statusLabel}>Pending Verifications</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusNumber}>0</Text>
            <Text style={styles.statusLabel}>Support Tickets</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Pending Verifications</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
        ) : pendingVerifications.length === 0 ? (
          <Text style={styles.emptyListText}>No pending verifications</Text>
        ) : (
          <FlatList
            data={pendingVerifications}
            renderItem={renderVerificationItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.verificationsList}
            onRefresh={onRefresh}
            refreshing={refreshing}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#3498db',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#3498db',
  },
  statusSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statusItem: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  loader: {
    marginTop: 20,
  },
  emptyListText: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#666',
    fontStyle: 'italic',
  },
  verificationsList: {
    flex: 1,
  },
  verificationItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    marginBottom: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  documentType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  submissionDate: {
    fontSize: 12,
    color: '#999',
  },
  verificationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default EmployeeDashboardScreen;