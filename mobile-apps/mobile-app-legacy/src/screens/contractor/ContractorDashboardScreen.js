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
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/apiClient';

const ContractorDashboardScreen = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [error, setError] = useState(null);

  // Format currency amount
  const formatCurrency = (amount, currency = 'USD') => {
    return `${parseFloat(amount).toFixed(2)} ${currency}`;
  };

  // Load contractor data
  const loadContractorData = async () => {
    try {
      // Fetch contractor analytics
      const analyticsData = await apiClient.contractor.getAnalytics();
      setAnalytics(analyticsData);

      // Fetch referrals
      const referralsData = await apiClient.contractor.getReferrals();
      setReferrals(referralsData);

      // Refresh user data
      await refreshUser();
      
      setError(null);
    } catch (error) {
      console.error('Error loading contractor data:', error);
      setError('Failed to load contractor data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadContractorData();
  };

  // Share referral code
  const shareReferralCode = async () => {
    if (!user?.referral_code) {
      Alert.alert('Error', 'Referral code not found');
      return;
    }

    try {
      const result = await Share.share({
        message: `Join CryptoEvoke Exchange using my referral code: ${user.referral_code}. Sign up at https://evo-exchange.com/register?ref=${user.referral_code}`,
        title: 'My CryptoEvoke Exchange Referral Link',
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share referral code');
    }
  };

  // Initial data loading
  useEffect(() => {
    loadContractorData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6200ee" />
            <Text style={styles.loadingText}>Loading contractor dashboard...</Text>
          </View>
        ) : (
          <>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeTitle}>
                Welcome, {user?.username || 'Contractor'}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Your Contractor Dashboard
              </Text>
            </View>

            <View style={styles.referralCard}>
              <View style={styles.referralHeader}>
                <Text style={styles.referralTitle}>Your Referral Code</Text>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={shareReferralCode}
                >
                  <Ionicons name="share-outline" size={20} color="#6200ee" />
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.referralCodeContainer}>
                <Text style={styles.referralCode}>{user?.referral_code || 'N/A'}</Text>
                <Text style={styles.referralRate}>
                  Commission Rate: {(user?.contractor_commission_rate * 100 || 85).toFixed(0)}%
                </Text>
              </View>
            </View>

            {analytics && (
              <View style={styles.analyticsCard}>
                <Text style={styles.cardTitle}>Analytics Overview</Text>
                
                <View style={styles.statRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{analytics.totalReferrals || 0}</Text>
                    <Text style={styles.statLabel}>Total Referrals</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{analytics.activeReferrals || 0}</Text>
                    <Text style={styles.statLabel}>Active Users</Text>
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
                      {formatCurrency(analytics.totalCommission || 0)}
                    </Text>
                    <Text style={styles.statLabel}>Total Commission</Text>
                  </View>
                </View>
                
                <View style={styles.timeframeContainer}>
                  <View style={styles.timeframeItem}>
                    <Text style={styles.timeframeLabel}>This Month:</Text>
                    <Text style={styles.timeframeValue}>
                      {formatCurrency(analytics.monthlyCommission || 0)}
                    </Text>
                  </View>
                  <View style={styles.timeframeItem}>
                    <Text style={styles.timeframeLabel}>Last Month:</Text>
                    <Text style={styles.timeframeValue}>
                      {formatCurrency(analytics.lastMonthCommission || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.referralsCard}>
              <Text style={styles.cardTitle}>Recent Referrals</Text>
              
              {referrals.length > 0 ? (
                referrals.map((referral, index) => (
                  <View key={index} style={styles.referralItem}>
                    <View style={styles.referralInfo}>
                      <Text style={styles.referralUsername}>
                        {referral.username || `User ${referral.id}`}
                      </Text>
                      <Text style={styles.referralDate}>
                        Joined: {new Date(referral.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.referralStats}>
                      <Text style={styles.referralDeposit}>
                        {formatCurrency(referral.deposits || 0)}
                      </Text>
                      <Text style={styles.referralCommission}>
                        Commission: {formatCurrency(referral.commission || 0)}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No referrals found</Text>
                  <Text style={styles.emptySubText}>
                    Share your referral code to start earning commissions
                  </Text>
                </View>
              )}
              
              {referrals.length > 0 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => {
                    Alert.alert('Coming Soon', 'View all referrals feature will be available soon.');
                  }}
                >
                  <Text style={styles.viewAllButtonText}>View All Referrals</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>Pro Tip</Text>
              <Text style={styles.tipText}>
                Share your referral code with potential clients to increase your commissions.
                You earn a percentage of their trading fees!
              </Text>
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
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
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
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  welcomeCard: {
    backgroundColor: '#6200ee',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  referralCard: {
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
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  referralTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0e6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shareButtonText: {
    color: '#6200ee',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  referralCodeContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  referralCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    letterSpacing: 1,
  },
  referralRate: {
    fontSize: 14,
    color: '#666',
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
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  timeframeContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  timeframeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeframeLabel: {
    fontSize: 14,
    color: '#666',
  },
  timeframeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  referralsCard: {
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
  referralItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  referralInfo: {
    flex: 1,
  },
  referralUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  referralDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  referralStats: {
    alignItems: 'flex-end',
  },
  referralDeposit: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  referralCommission: {
    fontSize: 14,
    color: '#4caf50',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  viewAllButton: {
    backgroundColor: '#f0e6ff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  viewAllButtonText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  tipCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});

export default ContractorDashboardScreen;