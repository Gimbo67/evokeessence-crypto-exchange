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
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

const ContractorDashboardScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalReferrals: 0,
    activeReferrals: 0,
    totalDeposits: 0,
    totalAmount: 0,
    totalCommission: 0,
    pendingCommission: 0,
    paidCommission: 0,
    recentReferrals: [],
    commissionRate: 0.12 // 12% default
  });

  // Fetch contractor analytics
  const fetchContractorAnalytics = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/contractor/analytics`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching contractor analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchContractorAnalytics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchContractorAnalytics();
  };

  // Format currency
  const formatCurrency = (amount) => {
    return '€' + amount.toFixed(2);
  };

  // Prepare pie chart data
  const pieChartData = [
    {
      name: 'Paid',
      amount: analytics.paidCommission,
      color: '#4caf50',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    },
    {
      name: 'Pending',
      amount: analytics.pendingCommission,
      color: '#ff9800',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }
  ];

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
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
        <Text style={styles.headerTitle}>Contractor Dashboard</Text>
      </View>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryCardContent}>
          <Text style={styles.summaryTitle}>Commission Summary</Text>
          <Text style={styles.commissionRate}>
            Commission Rate: {(analytics.commissionRate * 100).toFixed(0)}%
          </Text>
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>
                {formatCurrency(analytics.totalCommission)}
              </Text>
              <Text style={styles.summaryLabel}>Total Commission</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>
                {formatCurrency(analytics.pendingCommission)}
              </Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>
                {formatCurrency(analytics.paidCommission)}
              </Text>
              <Text style={styles.summaryLabel}>Paid</Text>
            </View>
          </View>
        </View>
      </Card>

      <View style={styles.statsRow}>
        <Card style={styles.statsCard}>
          <View style={styles.statsCardContent}>
            <View style={styles.statsIconContainer}>
              <Ionicons name="people" size={24} color="#6200ee" />
            </View>
            <Text style={styles.statsValue}>{analytics.totalReferrals}</Text>
            <Text style={styles.statsLabel}>Total Referrals</Text>
          </View>
        </Card>
        
        <Card style={styles.statsCard}>
          <View style={styles.statsCardContent}>
            <View style={styles.statsIconContainer}>
              <Ionicons name="cash" size={24} color="#6200ee" />
            </View>
            <Text style={styles.statsValue}>{analytics.totalDeposits}</Text>
            <Text style={styles.statsLabel}>Total Deposits</Text>
          </View>
        </Card>
      </View>

      <Card style={styles.amountCard}>
        <View style={styles.amountCardContent}>
          <View style={styles.amountInfo}>
            <Text style={styles.amountLabel}>Total Referred Amount</Text>
            <Text style={styles.amountValue}>
              {formatCurrency(analytics.totalAmount)}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('Referrals')}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color="#6200ee" />
          </TouchableOpacity>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Commission Distribution</Text>
      
      <Card style={styles.pieChartCard}>
        <View style={styles.pieChartContent}>
          {analytics.totalCommission > 0 ? (
            <PieChart
              data={pieChartData}
              width={screenWidth - 48}
              height={200}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              center={[10, 0]}
              absolute
            />
          ) : (
            <View style={styles.emptyChartContainer}>
              <Ionicons name="pie-chart" size={48} color="#bdbdbd" />
              <Text style={styles.emptyChartText}>No commission data yet</Text>
            </View>
          )}
        </View>
      </Card>

      <View style={styles.referralSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Referrals</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Referrals')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {analytics.recentReferrals.length > 0 ? (
          analytics.recentReferrals.map((referral, index) => (
            <Card key={index} style={styles.referralCard}>
              <TouchableOpacity 
                style={styles.referralCardContent}
                onPress={() => navigation.navigate('ReferralDetails', { referralId: referral.id })}
              >
                <View style={styles.referralInfo}>
                  <Text style={styles.referralName}>{referral.username}</Text>
                  <Text style={styles.referralDate}>
                    Joined: {new Date(referral.joinedAt).toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={styles.referralStats}>
                  <View style={styles.referralStat}>
                    <Text style={styles.referralStatValue}>{referral.depositCount}</Text>
                    <Text style={styles.referralStatLabel}>Deposits</Text>
                  </View>
                  
                  <View style={styles.referralStat}>
                    <Text style={styles.referralStatValue}>
                      {formatCurrency(referral.totalAmount)}
                    </Text>
                    <Text style={styles.referralStatLabel}>Amount</Text>
                  </View>
                  
                  <View style={styles.referralStat}>
                    <Text style={styles.referralStatValue}>
                      {formatCurrency(referral.commission)}
                    </Text>
                    <Text style={styles.referralStatLabel}>Commission</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Card>
          ))
        ) : (
          <View style={styles.emptyReferralsContainer}>
            <Ionicons name="people-outline" size={48} color="#bdbdbd" />
            <Text style={styles.emptyReferralsText}>No referrals yet</Text>
            <Text style={styles.emptyReferralsSubtext}>
              Share your referral code to start earning commission
            </Text>
            
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Ionicons name="share-social" size={18} color="#fff" />
              <Text style={styles.shareButtonText}>Share Your Code</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={styles.withdrawButton}
        onPress={() => navigation.navigate('WithdrawCommission')}
        disabled={analytics.pendingCommission <= 0}
      >
        <Ionicons name="cash-outline" size={20} color="#fff" />
        <Text style={styles.withdrawButtonText}>Withdraw Commission</Text>
      </TouchableOpacity>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryCard: {
    marginTop: -8,
    marginHorizontal: 16,
    borderRadius: 8,
    elevation: 4,
  },
  summaryCardContent: {
    padding: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  commissionRate: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
  },
  statsCard: {
    width: '48%',
    borderRadius: 8,
  },
  statsCardContent: {
    padding: 16,
    alignItems: 'center',
  },
  statsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(98, 0, 238, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsLabel: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  amountCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  amountCardContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountInfo: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 14,
    color: '#757575',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: '#6200ee',
    fontWeight: 'bold',
    marginRight: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  pieChartCard: {
    marginHorizontal: 16,
    borderRadius: 8,
  },
  pieChartContent: {
    padding: 16,
    alignItems: 'center',
  },
  emptyChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyChartText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 8,
  },
  referralSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  seeAllText: {
    color: '#6200ee',
    fontWeight: '500',
  },
  referralCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  referralCardContent: {
    padding: 16,
  },
  referralInfo: {
    marginBottom: 12,
  },
  referralName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  referralDate: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  referralStats: {
    flexDirection: 'row',
  },
  referralStat: {
    flex: 1,
  },
  referralStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  referralStatLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  emptyReferralsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyReferralsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#757575',
    marginTop: 8,
  },
  emptyReferralsSubtext: {
    fontSize: 14,
    color: '#9e9e9e',
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  withdrawButton: {
    backgroundColor: '#6200ee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 8,
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ContractorDashboardScreen;