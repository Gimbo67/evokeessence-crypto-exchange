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
import { userApi } from '../../api/apiClient';

// Define client data type
interface ClientData {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isVerified: boolean;
  createdAt: string;
  lastLogin: string;
  balances: Record<string, number>;
}

const EmployeeDashboardScreen = () => {
  const { user, logout } = useAuth();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load clients data
  useEffect(() => {
    loadClients();
  }, []);

  // Function to load clients
  const loadClients = async () => {
    try {
      setLoading(true);
      // In a real app, you would call a specific employee endpoint to get clients
      const response = await userApi.getClients();
      setClients(response.clients || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      Alert.alert('Error', 'Failed to load clients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadClients();
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

  // Handle client details view
  const viewClientDetails = (clientId: string) => {
    // In a full implementation, this would navigate to a client details screen
    Alert.alert(
      'Client Details',
      `Viewing details for client ID: ${clientId}. This feature would show full client information and transaction history.`
    );
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Calculate total portfolio value for a client
  const calculateClientPortfolio = (client: ClientData) => {
    // In a real app, this would calculate based on current market prices
    let total = 0;
    
    if (client.balances) {
      Object.entries(client.balances).forEach(([symbol, amount]) => {
        // For this example, we're using simplified values
        const estimatedPrice = getEstimatedPrice(symbol);
        total += amount * estimatedPrice;
      });
    }
    
    return total.toFixed(2);
  };

  // Get estimated price for a cryptocurrency (simplified for demo)
  const getEstimatedPrice = (symbol: string) => {
    const prices: Record<string, number> = {
      btc: 45000,
      eth: 3000,
      usdt: 1,
      usdc: 1,
    };
    
    return prices[symbol.toLowerCase()] || 0;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Employee Dashboard</Text>
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
        {/* Employee Info Card */}
        <View style={styles.employeeCard}>
          <Text style={styles.welcomeText}>
            Welcome, {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.roleText}>
            Role: Employee
          </Text>
          <Text style={styles.supportText}>
            You have access to client information to provide support and assistance.
          </Text>
        </View>
        
        {/* Clients List */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Client Management</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color="#0A2896" style={styles.loader} />
          ) : clients.length === 0 ? (
            <Text style={styles.noDataText}>No clients found</Text>
          ) : (
            clients.map(client => (
              <View key={client.id} style={styles.clientCard}>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>
                    {client.firstName} {client.lastName}
                  </Text>
                  <Text style={styles.clientEmail}>{client.email}</Text>
                  
                  <View style={styles.clientDetailRow}>
                    <Text style={styles.clientDetail}>
                      Portfolio: ${calculateClientPortfolio(client)}
                    </Text>
                    <View style={[
                      styles.statusIndicator,
                      client.isVerified ? styles.verifiedIndicator : styles.unverifiedIndicator
                    ]}>
                      <Text style={[
                        styles.statusText,
                        client.isVerified ? styles.verifiedText : styles.unverifiedText
                      ]}>
                        {client.isVerified ? 'Verified' : 'Unverified'}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.clientDetail}>
                    Last Login: {formatDate(client.lastLogin)}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.detailsButton}
                  onPress={() => viewClientDetails(client.id)}
                >
                  <Text style={styles.detailsButtonText}>Details</Text>
                </TouchableOpacity>
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
  employeeCard: {
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
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#050A30',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 16,
    color: '#0A2896',
    fontWeight: '500',
    marginBottom: 12,
  },
  supportText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
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
  clientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#050A30',
  },
  clientEmail: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  clientDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  clientDetail: {
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
  verifiedText: {
    color: '#34C759',
  },
  unverifiedText: {
    color: '#FF9500',
  },
  detailsButton: {
    backgroundColor: '#0A2896',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  detailsButtonText: {
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

export default EmployeeDashboardScreen;