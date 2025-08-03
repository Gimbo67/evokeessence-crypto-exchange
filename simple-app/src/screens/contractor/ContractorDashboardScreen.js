import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { contractorAPI } from '../../services/api';

export default function ContractorDashboardScreen({ navigation }) {
  const [analytics, setAnalytics] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month'); // 'week', 'month', 'year', 'all'
  
  const { user } = useAuth();
  
  // Load initial data when component mounts
  useEffect(() => {
    loadData();
  }, [timeframe]);
  
  // Load all data for the contractor dashboard
  const loadData = async () => {
    setIsLoading(true);
    
    try {
      // Load contractor analytics
      await fetchAnalytics();
      
      // Load referrals list
      await fetchReferrals();
    } catch (error) {
      console.error('Error loading contractor data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle pull-to-refresh
  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };
  
  // Fetch contractor analytics
  const fetchAnalytics = async () => {
    try {
      // In a real app, get this from the API
      // const analyticsData = await contractorAPI.getAnalytics();
      
      // Simulate API response for demo
      const mockAnalyticsData = {
        totalReferrals: 28,
        activeUsers: 21,
        totalCommission: 1250.75,
        pendingCommission: 320.50,
        paidCommission: 930.25,
        conversionRate: 75,
        commissionRate: 20,
        recentActivity: [
          { date: '2025-05-18', type: 'deposit', amount: 500.00, commission: 100.00, username: 'user123' },
          { date: '2025-05-15', type: 'deposit', amount: 250.00, commission: 50.00, username: 'trader456' },
          { date: '2025-05-10', type: 'payment', amount: 350.00, commission: 0, username: null },
          { date: '2025-05-08', type: 'deposit', amount: 1000.00, commission: 200.00, username: 'crypto789' },
        ]
      };
      
      setAnalytics(mockAnalyticsData);
    } catch (error) {
      console.error('Error fetching contractor analytics:', error);
    }
  };
  
  // Fetch referred users
  const fetchReferrals = async () => {
    try {
      // In a real app, get this from the API
      // const referralData = await contractorAPI.getReferrals();
      
      // Simulate API response for demo
      const mockReferralsData = [
        { id: 1, username: 'user123', email: 'user123@example.com', joinDate: '2025-04-20', totalDeposits: 1500.00, commissionEarned: 300.00, isActive: true },
        { id: 2, username: 'trader456', email: 'trader456@example.com', joinDate: '2025-04-25', totalDeposits: 750.00, commissionEarned: 150.00, isActive: true },
        { id: 3, username: 'crypto789', email: 'crypto789@example.com', joinDate: '2025-05-05', totalDeposits: 3000.00, commissionEarned: 600.00, isActive: true },
        { id: 4, username: 'invest101', email: 'invest101@example.com', joinDate: '2025-05-10', totalDeposits: 500.00, commissionEarned: 100.00, isActive: true },
        { id: 5, username: 'hodler202', email: 'hodler202@example.com', joinDate: '2025-05-12', totalDeposits: 0, commissionEarned: 0, isActive: false },
      ];
      
      setReferrals(mockReferralsData);
    } catch (error) {
      console.error('Error fetching referrals:', error);
    }
  };
  
  // Format currency value
  const formatCurrency = (value) => {
    return '$' + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };
  
  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Handle share referral code
  const handleShareReferralCode = () => {
    // In a real app, implement sharing functionality
    Alert.alert(
      'Share Referral Code',
      'Your referral code: A64S\n\nShare this code with potential users. You\'ll earn commission on their deposits!',
      [
        { text: 'Copy Code', onPress: () => console.log('Copy code pressed') },
        { text: 'Share', onPress: () => console.log('Share pressed') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };
  
  // Change timeframe for analytics
  const changeTimeframe = (newTimeframe) => {
    setTimeframe(newTimeframe);
  };
  
  // Render activity item
  const renderActivityItem = (item, index) => {
    const isPayment = item.type === 'payment';
    
    return (
      <View key={index} style={styles.activityItem}>
        <View style={styles.activityLeft}>
          <View style={[styles.activityIcon, isPayment ? styles.paymentIcon : styles.depositIcon]}>
            <Text style={styles.activityIconText}>{isPayment ? '💰' : '📥'}</Text>
          </View>
          <View style={styles.activityDetails}>
            <Text style={styles.activityTitle}>
              {isPayment ? 'Commission Payment' : `Deposit from ${item.username}`}
            </Text>
            <Text style={styles.activityDate}>{formatDate(item.date)}</Text>
          </View>
        </View>
        <View style={styles.activityRight}>
          <Text style={styles.activityAmount}>
            {isPayment ? formatCurrency(item.amount) : formatCurrency(item.commission)}
          </Text>
          <Text style={styles.activityType}>{isPayment ? 'Payment' : 'Commission'}</Text>
        </View>
      </View>
    );
  };
  
  // Render referral item
  const renderReferralItem = (item, index) => {
    return (
      <View key={item.id} style={styles.referralItem}>
        <View style={styles.referralHeader}>
          <Text style={styles.referralUsername}>{item.username}</Text>
          <View style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
        <Text style={styles.referralEmail}>{item.email}</Text>
        <Text style={styles.referralJoinDate}>Joined: {formatDate(item.joinDate)}</Text>
        
        <View style={styles.referralStats}>
          <View style={styles.referralStat}>
            <Text style={styles.referralStatLabel}>Total Deposits</Text>
            <Text style={styles.referralStatValue}>{formatCurrency(item.totalDeposits)}</Text>
          </View>
          <View style={styles.referralStat}>
            <Text style={styles.referralStatLabel}>Your Commission</Text>
            <Text style={styles.referralStatValue}>{formatCurrency(item.commissionEarned)}</Text>
          </View>
        </View>
      </View>
    );
  };
  
  // Render loading state
  if (isLoading && !analytics) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
        <Text style={styles.loadingText}>Loading contractor dashboard...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with title */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Contractor Dashboard</Text>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={handleShareReferralCode}
          >
            <Text style={styles.shareButtonText}>Share Code</Text>
          </TouchableOpacity>
        </View>
        
        {/* Commission summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Commission Summary</Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{formatCurrency(analytics?.totalCommission || 0)}</Text>
                <Text style={styles.summaryLabel}>Total Earned</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{formatCurrency(analytics?.pendingCommission || 0)}</Text>
                <Text style={styles.summaryLabel}>Pending</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>{formatCurrency(analytics?.paidCommission || 0)}</Text>
                <Text style={styles.summaryLabel}>Paid Out</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Referral stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Referral Performance</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{analytics?.totalReferrals || 0}</Text>
                <Text style={styles.statLabel}>Total Referrals</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{analytics?.activeUsers || 0}</Text>
                <Text style={styles.statLabel}>Active Users</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{analytics?.conversionRate || 0}%</Text>
                <Text style={styles.statLabel}>Conversion Rate</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{analytics?.commissionRate || 0}%</Text>
                <Text style={styles.statLabel}>Commission Rate</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Recent activity */}
        <View style={styles.activityContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.timeframeSelector}>
              <TouchableOpacity
                style={[styles.timeframeButton, timeframe === 'week' && styles.activeTimeframe]}
                onPress={() => changeTimeframe('week')}
              >
                <Text style={[styles.timeframeText, timeframe === 'week' && styles.activeTimeframeText]}>Week</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timeframeButton, timeframe === 'month' && styles.activeTimeframe]}
                onPress={() => changeTimeframe('month')}
              >
                <Text style={[styles.timeframeText, timeframe === 'month' && styles.activeTimeframeText]}>Month</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timeframeButton, timeframe === 'year' && styles.activeTimeframe]}
                onPress={() => changeTimeframe('year')}
              >
                <Text style={[styles.timeframeText, timeframe === 'year' && styles.activeTimeframeText]}>Year</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timeframeButton, timeframe === 'all' && styles.activeTimeframe]}
                onPress={() => changeTimeframe('all')}
              >
                <Text style={[styles.timeframeText, timeframe === 'all' && styles.activeTimeframeText]}>All</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.activityList}>
            {analytics?.recentActivity.length ? (
              analytics.recentActivity.map(renderActivityItem)
            ) : (
              <Text style={styles.emptyText}>No recent activity to display</Text>
            )}
          </View>
        </View>
        
        {/* Referred users */}
        <View style={styles.referralsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Referrals</Text>
            <TouchableOpacity>
              <Text style={styles.sectionAction}>Filter</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.referralsList}>
            {referrals.length ? (
              referrals.map(renderReferralItem)
            ) : (
              <Text style={styles.emptyText}>No referrals yet. Share your code to start earning!</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  shareButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  summaryContainer: {
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#9C27B0',
    borderRadius: 12,
    padding: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionAction: {
    color: '#9C27B0',
    fontWeight: 'bold',
  },
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  timeframeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  activeTimeframe: {
    backgroundColor: '#9C27B0',
  },
  timeframeText: {
    fontSize: 12,
    color: '#666',
  },
  activeTimeframeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  activityContainer: {
    marginBottom: 20,
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  depositIcon: {
    backgroundColor: '#E1F5FE',
  },
  paymentIcon: {
    backgroundColor: '#E8F5E9',
  },
  activityIconText: {
    fontSize: 18,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activityDate: {
    fontSize: 12,
    color: '#999',
  },
  activityRight: {
    alignItems: 'flex-end',
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9C27B0',
  },
  activityType: {
    fontSize: 12,
    color: '#999',
  },
  referralsContainer: {
    marginBottom: 30,
  },
  referralsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  referralItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  referralUsername: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
  },
  inactiveBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  referralEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  referralJoinDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  referralStats: {
    flexDirection: 'row',
    marginTop: 10,
  },
  referralStat: {
    flex: 1,
  },
  referralStatLabel: {
    fontSize: 12,
    color: '#999',
  },
  referralStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
  },
});