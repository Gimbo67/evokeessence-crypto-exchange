import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart, BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const ContractorAnalyticsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('month'); // week, month, year
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalReferrals: 0,
      activeReferrals: 0,
      totalDeposits: 0,
      totalAmount: 0,
      totalCommission: 0
    },
    depositsByDay: [],
    commissionByDay: [],
    referralsByDay: [],
    topReferrals: []
  });

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/contractor/analytics/detailed?timeframe=${timeframe}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setAnalyticsData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeframe]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalyticsData();
  };

  // Change timeframe
  const handleTimeframeChange = (newTimeframe) => {
    setTimeframe(newTimeframe);
    setLoading(true);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return '€' + amount.toFixed(2);
  };

  // Format data for charts
  const formatChartData = () => {
    // Format deposit data for chart
    const depositLabels = analyticsData.depositsByDay.map(item => item.date);
    const depositData = analyticsData.depositsByDay.map(item => item.amount);
    
    // Format commission data for chart
    const commissionLabels = analyticsData.commissionByDay.map(item => item.date);
    const commissionData = analyticsData.commissionByDay.map(item => item.amount);
    
    // Format referrals data for chart
    const referralLabels = analyticsData.referralsByDay.map(item => item.date);
    const referralData = analyticsData.referralsByDay.map(item => item.count);

    return {
      depositChart: {
        labels: depositLabels.length > 0 ? depositLabels : ['No data'],
        datasets: [
          {
            data: depositData.length > 0 ? depositData : [0],
            color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ['Deposit Amount']
      },
      commissionChart: {
        labels: commissionLabels.length > 0 ? commissionLabels : ['No data'],
        datasets: [
          {
            data: commissionData.length > 0 ? commissionData : [0],
            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ['Commission']
      },
      referralChart: {
        labels: referralLabels.length > 0 ? referralLabels : ['No data'],
        datasets: [
          {
            data: referralData.length > 0 ? referralData : [0],
            color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ['New Referrals']
      }
    };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  const chartData = formatChartData();

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#ffa726'
    }
  };

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
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>

      <View style={styles.timeframeSelector}>
        <TouchableOpacity 
          style={[
            styles.timeframeButton,
            timeframe === 'week' && styles.selectedTimeframe
          ]}
          onPress={() => handleTimeframeChange('week')}
        >
          <Text style={[
            styles.timeframeText,
            timeframe === 'week' && styles.selectedTimeframeText
          ]}>Week</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.timeframeButton,
            timeframe === 'month' && styles.selectedTimeframe
          ]}
          onPress={() => handleTimeframeChange('month')}
        >
          <Text style={[
            styles.timeframeText,
            timeframe === 'month' && styles.selectedTimeframeText
          ]}>Month</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.timeframeButton,
            timeframe === 'year' && styles.selectedTimeframe
          ]}
          onPress={() => handleTimeframeChange('year')}
        >
          <Text style={[
            styles.timeframeText,
            timeframe === 'year' && styles.selectedTimeframeText
          ]}>Year</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.overviewSection}>
        <Card style={styles.overviewCard}>
          <View style={styles.overviewCardContent}>
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>
                  {analyticsData.overview.totalReferrals}
                </Text>
                <Text style={styles.overviewLabel}>Total Referrals</Text>
              </View>
              
              <View style={styles.overviewDivider} />
              
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>
                  {analyticsData.overview.activeReferrals}
                </Text>
                <Text style={styles.overviewLabel}>Active Referrals</Text>
              </View>
            </View>
            
            <View style={styles.overviewRow}>
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>
                  {analyticsData.overview.totalDeposits}
                </Text>
                <Text style={styles.overviewLabel}>Total Deposits</Text>
              </View>
              
              <View style={styles.overviewDivider} />
              
              <View style={styles.overviewItem}>
                <Text style={styles.overviewValue}>
                  {formatCurrency(analyticsData.overview.totalAmount)}
                </Text>
                <Text style={styles.overviewLabel}>Total Amount</Text>
              </View>
            </View>
            
            <View style={styles.commissionOverview}>
              <Text style={styles.commissionLabel}>Total Commission</Text>
              <Text style={styles.commissionValue}>
                {formatCurrency(analyticsData.overview.totalCommission)}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      <Text style={styles.sectionTitle}>Deposits Over Time</Text>
      <Card style={styles.chartCard}>
        <View style={styles.chartCardContent}>
          <LineChart
            data={chartData.depositChart}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Commission Earnings</Text>
      <Card style={styles.chartCard}>
        <View style={styles.chartCardContent}>
          <LineChart
            data={chartData.commissionChart}
            width={screenWidth - 32}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`
            }}
            bezier
            style={styles.chart}
          />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>New Referrals</Text>
      <Card style={styles.chartCard}>
        <View style={styles.chartCardContent}>
          <BarChart
            data={chartData.referralChart}
            width={screenWidth - 32}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`
            }}
            style={styles.chart}
            fromZero
          />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Top Performing Referrals</Text>
      <Card style={styles.topReferralsCard}>
        <View style={styles.topReferralsContent}>
          {analyticsData.topReferrals.length > 0 ? (
            analyticsData.topReferrals.map((referral, index) => (
              <View key={index} style={styles.topReferralItem}>
                <View style={styles.referralRank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                
                <View style={styles.referralInfo}>
                  <Text style={styles.referralName}>{referral.username}</Text>
                  <Text style={styles.referralStat}>
                    {referral.depositCount} deposits · {formatCurrency(referral.totalAmount)}
                  </Text>
                </View>
                
                <View style={styles.referralCommission}>
                  <Text style={styles.commissionText}>
                    {formatCurrency(referral.commission)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyTopReferrals}>
              <Ionicons name="podium" size={48} color="#bdbdbd" />
              <Text style={styles.emptyTopReferralsText}>
                No referral data for this period
              </Text>
            </View>
          )}
        </View>
      </Card>
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
  timeframeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 24,
    marginHorizontal: 32,
    padding: 4,
  },
  timeframeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
  },
  selectedTimeframe: {
    backgroundColor: '#6200ee',
  },
  timeframeText: {
    fontSize: 14,
    color: '#616161',
  },
  selectedTimeframeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  overviewSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  overviewCard: {
    borderRadius: 8,
  },
  overviewCardContent: {
    padding: 16,
  },
  overviewRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  overviewLabel: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  commissionOverview: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  commissionLabel: {
    fontSize: 14,
    color: '#616161',
  },
  commissionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200ee',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  chartCardContent: {
    padding: 16,
  },
  chart: {
    borderRadius: 8,
  },
  topReferralsCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 8,
  },
  topReferralsContent: {
    padding: 16,
  },
  topReferralItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  referralRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  referralInfo: {
    flex: 1,
  },
  referralName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  referralStat: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  referralCommission: {
    alignItems: 'flex-end',
  },
  commissionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50',
  },
  emptyTopReferrals: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyTopReferralsText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ContractorAnalyticsScreen;