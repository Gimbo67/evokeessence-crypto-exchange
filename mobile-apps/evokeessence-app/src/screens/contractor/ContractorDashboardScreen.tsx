import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/authService';

interface ReferralStats {
  totalReferrals: number;
  activeUsers: number;
  totalCommission: number;
  pendingCommission: number;
  conversionRate: number;
}

interface Referral {
  id: number;
  username: string;
  email: string;
  signupDate: string;
  status: 'active' | 'pending' | 'inactive';
  deposits: number;
  commission: number;
}

interface Commission {
  id: number;
  amount: number;
  currency: string;
  referredUser: string;
  date: string;
  status: 'paid' | 'pending' | 'processing';
}

const ContractorDashboardScreen = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'commissions'>('overview');
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeUsers: 0,
    totalCommission: 0,
    pendingCommission: 0,
    conversionRate: 0,
  });
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [referralCode, setReferralCode] = useState<string>('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, these would be separate API calls
      await fetchReferralStats();
      await fetchReferrals();
      await fetchCommissions();
      await fetchReferralCode();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert(
        'Error',
        'Could not load contractor dashboard data. Please try again later.'
      );
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const fetchReferralStats = async () => {
    try {
      const response = await apiClient.get('/contractor/stats');
      setReferralStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      // For demo purposes, set mock data if API fails
      setReferralStats({
        totalReferrals: 28,
        activeUsers: 22,
        totalCommission: 1250.75,
        pendingCommission: 350.50,
        conversionRate: 78.6
      });
    }
  };

  const fetchReferrals = async () => {
    try {
      const response = await apiClient.get('/contractor/referrals');
      setReferrals(response.data.referrals);
    } catch (error) {
      console.error('Error fetching referrals:', error);
      // For demo purposes, set mock data if API fails
      setReferrals([
        {
          id: 1,
          username: 'jsmith2025',
          email: 'j.smith@example.com',
          signupDate: '2025-05-01T14:30:00Z',
          status: 'active',
          deposits: 500,
          commission: 25
        },
        {
          id: 2,
          username: 'mjohnson',
          email: 'm.johnson@example.com',
          signupDate: '2025-05-05T10:15:00Z',
          status: 'active',
          deposits: 1200,
          commission: 60
        },
        {
          id: 3,
          username: 'sarahbrown',
          email: 's.brown@example.com',
          signupDate: '2025-05-10T16:45:00Z',
          status: 'pending',
          deposits: 0,
          commission: 0
        },
        {
          id: 4,
          username: 'davidwilson',
          email: 'd.wilson@example.com',
          signupDate: '2025-05-12T09:20:00Z',
          status: 'active',
          deposits: 800,
          commission: 40
        },
        {
          id: 5,
          username: 'emilydavis',
          email: 'e.davis@example.com',
          signupDate: '2025-05-15T11:30:00Z',
          status: 'inactive',
          deposits: 0,
          commission: 0
        }
      ]);
    }
  };

  const fetchCommissions = async () => {
    try {
      const response = await apiClient.get('/contractor/commissions');
      setCommissions(response.data.commissions);
    } catch (error) {
      console.error('Error fetching commissions:', error);
      // For demo purposes, set mock data if API fails
      setCommissions([
        {
          id: 101,
          amount: 25,
          currency: 'USDC',
          referredUser: 'jsmith2025',
          date: '2025-05-05T15:30:00Z',
          status: 'paid'
        },
        {
          id: 102,
          amount: 60,
          currency: 'USDC',
          referredUser: 'mjohnson',
          date: '2025-05-08T12:45:00Z',
          status: 'paid'
        },
        {
          id: 103,
          amount: 40,
          currency: 'USDC',
          referredUser: 'davidwilson',
          date: '2025-05-15T10:20:00Z',
          status: 'processing'
        },
        {
          id: 104,
          amount: 30,
          currency: 'USDC',
          referredUser: 'alexturner',
          date: '2025-05-17T16:10:00Z',
          status: 'pending'
        },
        {
          id: 105,
          amount: 55,
          currency: 'USDC',
          referredUser: 'sophiawright',
          date: '2025-05-19T09:30:00Z',
          status: 'pending'
        }
      ]);
    }
  };

  const fetchReferralCode = async () => {
    try {
      const response = await apiClient.get('/contractor/referral-code');
      setReferralCode(response.data.code);
    } catch (error) {
      console.error('Error fetching referral code:', error);
      // For demo purposes, set mock data if API fails
      setReferralCode(user?.referralCode || "A64S");
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleShareReferralCode = async () => {
    try {
      const result = await Share.share({
        message: `Join EvokeEssence with my referral code: ${referralCode} and get a 10% discount on trading fees!`,
        url: 'https://evokeessence.com/signup',
        title: 'Join EvokeEssence Cryptocurrency Exchange',
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log(`Shared via ${result.activityType}`);
        } else {
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Dismissed');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not share referral code');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderOverviewTab = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.referralCodeCard}>
          <Text style={styles.referralCodeTitle}>Your Referral Code</Text>
          <View style={styles.referralCodeContainer}>
            <Text style={styles.referralCode}>{referralCode}</Text>
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={handleShareReferralCode}
            >
              <Ionicons name="share-social" size={22} color="#fff" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.referralCodeDescription}>
            Share this code with others to earn commissions when they make trades.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Performance Overview</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statCardInner}>
              <Ionicons name="people" size={24} color="#0066CC" style={styles.statIcon} />
              <Text style={styles.statTitle}>Total Referrals</Text>
              <Text style={styles.statValue}>{referralStats.totalReferrals}</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statCardInner}>
              <Ionicons name="person" size={24} color="#4CAF50" style={styles.statIcon} />
              <Text style={styles.statTitle}>Active Users</Text>
              <Text style={styles.statValue}>{referralStats.activeUsers}</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statCardInner}>
              <Ionicons name="cash" size={24} color="#FFA000" style={styles.statIcon} />
              <Text style={styles.statTitle}>Total Commission</Text>
              <Text style={styles.statValue}>{formatCurrency(referralStats.totalCommission)}</Text>
            </View>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statCardInner}>
              <Ionicons name="time" size={24} color="#FF5722" style={styles.statIcon} />
              <Text style={styles.statTitle}>Pending Commission</Text>
              <Text style={styles.statValue}>{formatCurrency(referralStats.pendingCommission)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.conversionCard}>
          <View style={styles.conversionHeader}>
            <Text style={styles.conversionTitle}>Conversion Rate</Text>
            <Text style={styles.conversionValue}>{referralStats.conversionRate}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar,
                {width: `${Math.min(referralStats.conversionRate, 100)}%`}
              ]}
            />
          </View>
          <Text style={styles.conversionDescription}>
            Percentage of referred users who made at least one deposit
          </Text>
        </View>

        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => setActiveTab('referrals')}>
              <Ionicons name="people-circle" size={28} color="#0066CC" />
              <Text style={styles.quickActionText}>View Referrals</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => setActiveTab('commissions')}>
              <Ionicons name="cash" size={28} color="#0066CC" />
              <Text style={styles.quickActionText}>View Commissions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleShareReferralCode}>
              <Ionicons name="share-social" size={28} color="#0066CC" />
              <Text style={styles.quickActionText}>Share Code</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={() => Alert.alert('Coming Soon', 'Marketing materials will be available in the next update.')}
            >
              <Ionicons name="document-text" size={28} color="#0066CC" />
              <Text style={styles.quickActionText}>Marketing Assets</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderReferralsTab = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Your Referrals</Text>
        
        {referrals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No referrals yet</Text>
            <Text style={styles.emptySubtext}>Share your referral code to start earning commissions</Text>
            <TouchableOpacity 
              style={styles.shareButtonLarge}
              onPress={handleShareReferralCode}
            >
              <Ionicons name="share-social" size={22} color="#fff" />
              <Text style={styles.shareButtonText}>Share Your Code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.filterContainer}>
              <TouchableOpacity style={[styles.filterButton, styles.activeFilterButton]}>
                <Text style={styles.activeFilterButtonText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterButtonText}>Active</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterButtonText}>Pending</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterButtonText}>Inactive</Text>
              </TouchableOpacity>
            </View>
            
            {referrals.map((referral) => (
              <View key={referral.id} style={styles.referralCard}>
                <View style={styles.referralHeader}>
                  <View style={styles.referralUser}>
                    <View style={[
                      styles.statusIndicator,
                      referral.status === 'active' ? styles.statusActive :
                      referral.status === 'pending' ? styles.statusPending :
                      styles.statusInactive
                    ]} />
                    <Text style={styles.referralUsername}>{referral.username}</Text>
                  </View>
                  <Text style={styles.referralDate}>Joined: {formatDate(referral.signupDate)}</Text>
                </View>
                
                <View style={styles.referralDetails}>
                  <View style={styles.referralDetail}>
                    <Text style={styles.referralDetailLabel}>Email:</Text>
                    <Text style={styles.referralDetailValue}>{referral.email}</Text>
                  </View>
                  <View style={styles.referralDetail}>
                    <Text style={styles.referralDetailLabel}>Status:</Text>
                    <Text style={[
                      styles.referralDetailValue,
                      referral.status === 'active' ? styles.textActive :
                      referral.status === 'pending' ? styles.textPending :
                      styles.textInactive
                    ]}>
                      {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.referralDetail}>
                    <Text style={styles.referralDetailLabel}>Deposits:</Text>
                    <Text style={styles.referralDetailValue}>{formatCurrency(referral.deposits)}</Text>
                  </View>
                  <View style={styles.referralDetail}>
                    <Text style={styles.referralDetailLabel}>Commission:</Text>
                    <Text style={styles.referralDetailValue}>{formatCurrency(referral.commission)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    );
  };

  const renderCommissionsTab = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Your Commissions</Text>
        
        <View style={styles.commissionsHeader}>
          <View style={styles.commissionSummary}>
            <Text style={styles.commissionSummaryLabel}>Total Earned</Text>
            <Text style={styles.commissionSummaryValue}>{formatCurrency(referralStats.totalCommission)}</Text>
          </View>
          <View style={styles.commissionSummary}>
            <Text style={styles.commissionSummaryLabel}>Pending</Text>
            <Text style={styles.commissionSummaryValue}>{formatCurrency(referralStats.pendingCommission)}</Text>
          </View>
        </View>
        
        {commissions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cash" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No commissions yet</Text>
            <Text style={styles.emptySubtext}>Share your referral code to start earning commissions</Text>
          </View>
        ) : (
          <>
            <View style={styles.filterContainer}>
              <TouchableOpacity style={[styles.filterButton, styles.activeFilterButton]}>
                <Text style={styles.activeFilterButtonText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterButtonText}>Paid</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterButtonText}>Pending</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterButton}>
                <Text style={styles.filterButtonText}>Processing</Text>
              </TouchableOpacity>
            </View>
            
            {commissions.map((commission) => (
              <View key={commission.id} style={styles.commissionCard}>
                <View style={styles.commissionHeader}>
                  <View style={styles.commissionAmount}>
                    <Text style={styles.commissionValue}>
                      +{commission.amount} {commission.currency}
                    </Text>
                    <View style={[
                      styles.commissionStatus,
                      commission.status === 'paid' ? styles.statusPaid :
                      commission.status === 'processing' ? styles.statusProcessing :
                      styles.statusPending
                    ]}>
                      <Text style={styles.commissionStatusText}>
                        {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.commissionDate}>{formatDate(commission.date)}</Text>
                </View>
                
                <View style={styles.commissionDetails}>
                  <Text style={styles.commissionDetailsText}>
                    Commission from <Text style={styles.commissionUserText}>{commission.referredUser}</Text>
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'referrals':
        return renderReferralsTab();
      case 'commissions':
        return renderCommissionsTab();
      default:
        return renderOverviewTab();
    }
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading contractor dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contractor Dashboard</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderContent()}
      </ScrollView>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'overview' && styles.activeTabButton]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons
            name="home"
            size={22}
            color={activeTab === 'overview' ? '#0066CC' : '#999'}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'overview' && styles.activeTabButtonText,
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'referrals' && styles.activeTabButton]}
          onPress={() => setActiveTab('referrals')}
        >
          <Ionicons
            name="people"
            size={22}
            color={activeTab === 'referrals' ? '#0066CC' : '#999'}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'referrals' && styles.activeTabButtonText,
            ]}
          >
            Referrals
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'commissions' && styles.activeTabButton]}
          onPress={() => setActiveTab('commissions')}
        >
          <Ionicons
            name="cash"
            size={22}
            color={activeTab === 'commissions' ? '#0066CC' : '#999'}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'commissions' && styles.activeTabButtonText,
            ]}
          >
            Commissions
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#0066CC',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  referralCodeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  referralCodeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  referralCodeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  referralCode: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0066CC',
    letterSpacing: 2,
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 5,
  },
  referralCodeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 20,
  },
  statCard: {
    width: '50%',
    padding: 5,
  },
  statCardInner: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  statIcon: {
    marginBottom: 10,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  conversionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  conversionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  conversionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  conversionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginBottom: 15,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  conversionDescription: {
    fontSize: 14,
    color: '#666',
  },
  quickActionsContainer: {
    marginBottom: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  quickActionButton: {
    width: '25%',
    padding: 5,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    marginTop: 5,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  emptySubtext: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  shareButtonLarge: {
    flexDirection: 'row',
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
  },
  filterButtonText: {
    color: '#666',
    fontSize: 14,
  },
  activeFilterButton: {
    backgroundColor: '#0066CC',
  },
  activeFilterButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  referralCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  referralHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  referralUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: '#4CAF50',
  },
  statusPending: {
    backgroundColor: '#FFA000',
  },
  statusInactive: {
    backgroundColor: '#F44336',
  },
  statusPaid: {
    backgroundColor: '#E8F5E9',
  },
  statusProcessing: {
    backgroundColor: '#FFF3E0',
  },
  textActive: {
    color: '#4CAF50',
  },
  textPending: {
    color: '#FFA000',
  },
  textInactive: {
    color: '#F44336',
  },
  referralUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  referralDate: {
    fontSize: 14,
    color: '#666',
  },
  referralDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  referralDetail: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  referralDetailLabel: {
    width: 100,
    fontSize: 14,
    color: '#666',
  },
  referralDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  commissionsHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  commissionSummary: {
    flex: 1,
    alignItems: 'center',
  },
  commissionSummaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  commissionSummaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  commissionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  commissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  commissionAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commissionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 10,
  },
  commissionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  commissionStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  commissionDate: {
    fontSize: 14,
    color: '#666',
  },
  commissionDetails: {
    marginTop: 5,
  },
  commissionDetailsText: {
    fontSize: 14,
    color: '#666',
  },
  commissionUserText: {
    fontWeight: '600',
    color: '#333',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeTabButton: {
    borderTopWidth: 2,
    borderTopColor: '#0066CC',
  },
  tabButtonText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  activeTabButtonText: {
    color: '#0066CC',
  },
});

export default ContractorDashboardScreen;