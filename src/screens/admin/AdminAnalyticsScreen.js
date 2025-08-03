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
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

const AdminAnalyticsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('week'); // week, month, year
  const [analyticsData, setAnalyticsData] = useState({
    deposits: {
      total: 0,
      averageSize: 0,
      byDay: []
    },
    users: {
      total: 0,
      activeUsers: 0,
      newUsers: []
    },
    contractors: {
      total: 0,
      totalDeposits: 0,
      totalAmount: 0,
      totalCommission: 0
    }
  });

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/admin/analytics?timeframe=${timeframe}`, {
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

  // Format data for charts
  const formatChartData = () => {
    // Format deposit data for chart
    const depositLabels = analyticsData.deposits.byDay.map(item => item.date);
    const depositData = analyticsData.deposits.byDay.map(item => item.amount);
    
    // Format user data for chart
    const userLabels = analyticsData.users.newUsers.map(item => item.date);
    const userData = analyticsData.users.newUsers.map(item => item.count);

    // Format contractor data for pie chart
    const contractorPieData = [
      {
        name: 'Commission',
        amount: analyticsData.contractors.totalCommission,
        color: '#6200ee',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      },
      {
        name: 'Deposits',
        amount: analyticsData.contractors.totalAmount - analyticsData.contractors.totalCommission,
        color: '#03dac6',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      }
    ];

    return {
      depositChart: {
        labels: depositLabels,
        datasets: [
          {
            data: depositData.length > 0 ? depositData : [0],
            color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ['Deposits']
      },
      userChart: {
        labels: userLabels,
        datasets: [
          {
            data: userData.length > 0 ? userData : [0],
            color: (opacity = 1) => `rgba(3, 218, 198, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ['New Users']
      },
      contractorPieData
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
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '6',
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

      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryCardContent}>
            <Ionicons name="cash" size={28} color="#6200ee" />
            <Text style={styles.summaryValue}>{analyticsData.deposits.total.toFixed(2)} €</Text>
            <Text style={styles.summaryLabel}>Total Deposits</Text>
          </View>
        </Card>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryCardContent}>
            <Ionicons name="people" size={28} color="#03dac6" />
            <Text style={styles.summaryValue}>{analyticsData.users.total}</Text>
            <Text style={styles.summaryLabel}>Total Users</Text>
          </View>
        </Card>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Deposits over time</Text>
        <LineChart
          data={chartData.depositChart}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>New users over time</Text>
        <BarChart
          data={chartData.userChart}
          width={screenWidth - 32}
          height={220}
          chartConfig={{
            ...chartConfig,
            color: (opacity = 1) => `rgba(3, 218, 198, ${opacity})`
          }}
          style={styles.chart}
        />
      </View>

      <Card style={styles.contractorCard}>
        <View style={styles.contractorCardHeader}>
          <Ionicons name="briefcase" size={24} color="#6200ee" />
          <Text style={styles.contractorCardTitle}>Contractor Program Analytics</Text>
        </View>
        
        <View style={styles.contractorStats}>
          <View style={styles.contractorRow}>
            <View style={styles.contractorStat}>
              <Text style={styles.contractorStatLabel}>Total Contractors</Text>
              <Text style={styles.contractorStatValue}>{analyticsData.contractors.total}</Text>
            </View>
            <View style={styles.contractorStat}>
              <Text style={styles.contractorStatLabel}>Total Referred Deposits</Text>
              <Text style={styles.contractorStatValue}>{analyticsData.contractors.totalDeposits}</Text>
            </View>
          </View>
          
          <View style={styles.contractorRow}>
            <View style={styles.contractorStat}>
              <Text style={styles.contractorStatLabel}>Total Amount</Text>
              <Text style={styles.contractorStatValue}>{analyticsData.contractors.totalAmount.toFixed(2)} €</Text>
            </View>
            <View style={styles.contractorStat}>
              <Text style={styles.contractorStatLabel}>Total Commission</Text>
              <Text style={styles.contractorStatValue}>{analyticsData.contractors.totalCommission.toFixed(2)} €</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.pieChartContainer}>
          <PieChart
            data={chartData.contractorPieData}
            width={screenWidth - 64}
            height={180}
            chartConfig={chartConfig}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 0]}
            absolute
          />
        </View>
      </Card>

      <View style={styles.exportSection}>
        <Text style={styles.sectionTitle}>Export Data</Text>
        <View style={styles.exportButtons}>
          <TouchableOpacity style={styles.exportButton}>
            <Ionicons name="download" size={20} color="#fff" />
            <Text style={styles.exportButtonText}>CSV</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.exportButton}>
            <Ionicons name="document" size={20} color="#fff" />
            <Text style={styles.exportButtonText}>PDF</Text>
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    width: '48%',
    borderRadius: 8,
    elevation: 2,
  },
  summaryCardContent: {
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 12,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chart: {
    borderRadius: 8,
  },
  contractorCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
    padding: 16,
  },
  contractorCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contractorCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  contractorStats: {
    marginBottom: 16,
  },
  contractorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  contractorStat: {
    width: '48%',
  },
  contractorStatLabel: {
    fontSize: 12,
    color: '#757575',
  },
  contractorStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  pieChartContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  exportSection: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  exportButtons: {
    flexDirection: 'row',
  },
  exportButton: {
    backgroundColor: '#6200ee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    marginRight: 12,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default AdminAnalyticsScreen;