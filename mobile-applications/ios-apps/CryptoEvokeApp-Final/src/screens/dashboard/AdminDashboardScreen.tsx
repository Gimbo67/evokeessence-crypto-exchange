import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../../store/AuthContext';
import { apiClient } from '../../api/apiClient';

interface AdminStats {
  totalUsers: number;
  pendingVerifications: number;
  totalVolume: number;
  activeEmployees: number;
}

const AdminDashboardScreen = () => {
  const { logout } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/admin/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.welcomeText}>Welcome, Admin</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#4a80f5" style={styles.loader} />
        ) : (
          <>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats?.totalUsers || 0}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats?.pendingVerifications || 0}</Text>
                <Text style={styles.statLabel}>Pending Verifications</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>${stats?.totalVolume?.toFixed(2) || '0.00'}</Text>
                <Text style={styles.statLabel}>24h Volume</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats?.activeEmployees || 0}</Text>
                <Text style={styles.statLabel}>Active Employees</Text>
              </View>
            </View>

            <View style={styles.adminActions}>
              <Text style={styles.sectionTitle}>Admin Actions</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>User Management</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Verify Clients</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>System Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Security Logs</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.securitySection}>
              <Text style={styles.sectionTitle}>Security Overview</Text>
              <View style={styles.securityItem}>
                <Text style={styles.securityLabel}>Failed Login Attempts (24h)</Text>
                <Text style={styles.securityValue}>12</Text>
              </View>
              <View style={styles.securityItem}>
                <Text style={styles.securityLabel}>Banned IP Addresses</Text>
                <Text style={styles.securityValue}>7</Text>
              </View>
              <View style={styles.securityItem}>
                <Text style={styles.securityLabel}>Security Alerts</Text>
                <Text style={styles.securityValue}>2</Text>
              </View>
              <TouchableOpacity style={styles.securityButton}>
                <Text style={styles.securityButtonText}>View Security Dashboard</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
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
    backgroundColor: '#2c3e50',
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
    color: '#2c3e50',
  },
  loader: {
    marginTop: 50,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4a80f5',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 12,
    color: '#2c3e50',
  },
  adminActions: {
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionButton: {
    width: '48%',
    backgroundColor: '#2c3e50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  securitySection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  securityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  securityLabel: {
    fontSize: 16,
    color: '#333',
  },
  securityValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  securityButton: {
    backgroundColor: '#4a80f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  securityButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default AdminDashboardScreen;