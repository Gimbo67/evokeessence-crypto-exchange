import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AdminDashboardScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingVerifications: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    contractors: {
      count: 0,
      referredDeposits: 0,
      referredAmount: 0,
      commissionAmount: 0
    }
  });

  const fetchAdminStats = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/admin/analytics`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminStats();
  };

  const navigateToSection = (section) => {
    switch (section) {
      case 'users':
        navigation.navigate('Users');
        break;
      case 'verifications':
        navigation.navigate('Users', { screen: 'Verifications' });
        break;
      case 'contractors':
        navigation.navigate('Users', { filter: 'contractors' });
        break;
      case 'analytics':
        navigation.navigate('Analytics');
        break;
      case 'settings':
        navigation.navigate('Settings');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#6200ee']}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statsCard}>
          <TouchableOpacity 
            style={styles.cardContent}
            onPress={() => navigateToSection('users')}
          >
            <Ionicons name="people" size={28} color="#6200ee" />
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.statsCard}>
          <TouchableOpacity 
            style={styles.cardContent}
            onPress={() => navigateToSection('verifications')}
          >
            <Ionicons name="hourglass" size={28} color="#fb8c00" />
            <Text style={styles.statValue}>{stats.pendingVerifications}</Text>
            <Text style={styles.statLabel}>Pending Verifications</Text>
          </TouchableOpacity>
        </Card>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statsCard}>
          <TouchableOpacity 
            style={styles.cardContent}
            onPress={() => navigateToSection('analytics')}
          >
            <Ionicons name="cash" size={28} color="#43a047" />
            <Text style={styles.statValue}>{stats.totalDeposits.toFixed(2)} €</Text>
            <Text style={styles.statLabel}>Total Deposits</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.statsCard}>
          <TouchableOpacity 
            style={styles.cardContent}
            onPress={() => navigateToSection('analytics')}
          >
            <Ionicons name="trending-down" size={28} color="#e53935" />
            <Text style={styles.statValue}>{stats.totalWithdrawals.toFixed(2)} €</Text>
            <Text style={styles.statLabel}>Total Withdrawals</Text>
          </TouchableOpacity>
        </Card>
      </View>

      <Card style={styles.contractorCard}>
        <TouchableOpacity 
          style={styles.contractorCardContent}
          onPress={() => navigateToSection('contractors')}
        >
          <View style={styles.contractorHeader}>
            <Ionicons name="briefcase" size={24} color="#6200ee" />
            <Text style={styles.contractorTitle}>Contractor Program</Text>
          </View>
          
          <View style={styles.contractorStats}>
            <View style={styles.contractorStat}>
              <Text style={styles.contractorStatValue}>{stats.contractors.count}</Text>
              <Text style={styles.contractorStatLabel}>Contractors</Text>
            </View>
            
            <View style={styles.contractorStat}>
              <Text style={styles.contractorStatValue}>{stats.contractors.referredDeposits}</Text>
              <Text style={styles.contractorStatLabel}>Referred Deposits</Text>
            </View>
            
            <View style={styles.contractorStat}>
              <Text style={styles.contractorStatValue}>{stats.contractors.referredAmount.toFixed(2)} €</Text>
              <Text style={styles.contractorStatLabel}>Referred Amount</Text>
            </View>
            
            <View style={styles.contractorStat}>
              <Text style={styles.contractorStatValue}>{stats.contractors.commissionAmount.toFixed(2)} €</Text>
              <Text style={styles.contractorStatLabel}>Commissions</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Card>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigateToSection('users')}
          >
            <Ionicons name="person-add" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Add User</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigateToSection('verifications')}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Approve KYC</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigateToSection('analytics')}
          >
            <Ionicons name="analytics" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>View Reports</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigateToSection('settings')}
          >
            <Ionicons name="settings" size={24} color="#fff" />
            <Text style={styles.actionButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#6200ee',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsCard: {
    width: '48%',
    elevation: 2,
    borderRadius: 8,
  },
  cardContent: {
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  contractorCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  contractorCardContent: {
    padding: 16,
  },
  contractorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contractorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  contractorStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  contractorStat: {
    width: '48%',
    marginBottom: 12,
  },
  contractorStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  contractorStatLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  quickActions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#6200ee',
    padding: 16,
    borderRadius: 8,
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default AdminDashboardScreen;