import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import ApiService from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import WalletAssetItem from './components/WalletAssetItem';
import errorHandler from '../../utils/ErrorHandler';

const screenWidth = Dimensions.get('window').width;

const WalletScreen = ({ navigation }) => {
  const { user, updateActivity } = useAuth();
  const { t, formatCurrency } = useLocalization();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletData, setWalletData] = useState({
    totalBalance: 0,
    assets: [],
    balanceHistory: []
  });
  const [selectedPeriod, setSelectedPeriod] = useState('1w'); // 1d, 1w, 1m, 3m, 1y, all
  
  // Fetch wallet data
  const fetchWalletData = async () => {
    try {
      setLoading(true);
      
      // Get wallet data
      const response = await ApiService.getWalletData();
      
      if (response.success) {
        setWalletData({
          totalBalance: response.data.totalBalance,
          assets: response.data.assets,
          balanceHistory: response.data.balanceHistory
        });
      } else {
        throw new Error(response.message || 'Failed to load wallet data');
      }
    } catch (error) {
      errorHandler.handleApiError(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Fetch historical balance data
  const fetchBalanceHistory = async (period) => {
    try {
      // Get historical balance data
      const response = await ApiService.getBalanceHistory(period);
      
      if (response.success) {
        setWalletData(prev => ({
          ...prev,
          balanceHistory: response.data.balanceHistory
        }));
      }
    } catch (error) {
      console.error('Error fetching balance history:', error);
    }
  };
  
  useEffect(() => {
    fetchWalletData();
    
    // Update user activity when screen is focused
    updateActivity();
    
    // Set up navigation focus listener
    const unsubscribe = navigation.addListener('focus', () => {
      updateActivity();
      fetchWalletData();
    });
    
    return unsubscribe;
  }, []);
  
  // Handle period change
  useEffect(() => {
    fetchBalanceHistory(selectedPeriod);
  }, [selectedPeriod]);
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };
  
  // Navigate to deposit screen
  const navigateToDeposit = () => {
    navigation.navigate('Deposit');
  };
  
  // Navigate to withdraw screen
  const navigateToWithdraw = () => {
    navigation.navigate('Withdraw');
  };
  
  // Format chart data
  const getChartData = () => {
    const labels = walletData.balanceHistory.map(item => item.date);
    const data = walletData.balanceHistory.map(item => item.balance);
    
    // Fallback data if history is empty
    if (data.length === 0) {
      return {
        labels: ['', '', '', '', '', ''],
        datasets: [
          {
            data: [0, 0, 0, 0, 0, 0],
            color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
            strokeWidth: 2
          }
        ]
      };
    }
    
    return {
      labels,
      datasets: [
        {
          data,
          color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };
  };
  
  // Chart configuration
  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#6200ee'
    }
  };
  
  // Calculate total 24h change percentage
  const calculateTotalChange = () => {
    if (walletData.assets.length === 0) return 0;
    
    const totalValue = walletData.totalBalance;
    const totalChange = walletData.assets.reduce((sum, asset) => sum + (asset.change24h * asset.value), 0);
    
    return totalValue > 0 ? (totalChange / totalValue) * 100 : 0;
  };
  
  // Render loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('wallet')}</Text>
      </View>
      
      <FlatList
        data={walletData.assets}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <WalletAssetItem
            asset={item}
            onPress={() => navigation.navigate('AssetDetails', { assetId: item.id })}
          />
        )}
        ListHeaderComponent={
          <>
            <Card style={styles.balanceCard}>
              <View style={styles.balanceCardContent}>
                <Text style={styles.balanceLabel}>{t('total_balance')}</Text>
                <Text style={styles.balanceAmount}>{formatCurrency(walletData.totalBalance)}</Text>
                
                <View style={styles.changeContainer}>
                  <Ionicons
                    name={calculateTotalChange() >= 0 ? 'caret-up' : 'caret-down'}
                    size={16}
                    color={calculateTotalChange() >= 0 ? '#4caf50' : '#f44336'}
                  />
                  <Text
                    style={[
                      styles.changeText,
                      calculateTotalChange() >= 0 ? styles.positiveChange : styles.negativeChange
                    ]}
                  >
                    {Math.abs(calculateTotalChange()).toFixed(2)}%
                  </Text>
                  <Text style={styles.periodText}>24h</Text>
                </View>
                
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={navigateToDeposit}
                  >
                    <View style={styles.actionIconContainer}>
                      <Ionicons name="arrow-down" size={20} color="#fff" />
                    </View>
                    <Text style={styles.actionButtonText}>{t('deposit')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={navigateToWithdraw}
                  >
                    <View style={styles.actionIconContainer}>
                      <Ionicons name="arrow-up" size={20} color="#fff" />
                    </View>
                    <Text style={styles.actionButtonText}>{t('withdraw')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
            
            <Card style={styles.chartCard}>
              <View style={styles.chartCardContent}>
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>{t('balance_history')}</Text>
                  <View style={styles.periodSelector}>
                    {['1d', '1w', '1m', '3m', '1y', 'all'].map((period) => (
                      <TouchableOpacity
                        key={period}
                        style={[
                          styles.periodButton,
                          selectedPeriod === period && styles.selectedPeriodButton
                        ]}
                        onPress={() => setSelectedPeriod(period)}
                      >
                        <Text
                          style={[
                            styles.periodButtonText,
                            selectedPeriod === period && styles.selectedPeriodButtonText
                          ]}
                        >
                          {period.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <LineChart
                  data={getChartData()}
                  width={screenWidth - 32}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                />
              </View>
            </Card>
            
            <View style={styles.assetsHeader}>
              <Text style={styles.assetsTitle}>{t('my_assets')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AllAssets')}>
                <Text style={styles.viewAllText}>{t('view_all')}</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={64} color="#bdbdbd" />
            <Text style={styles.emptyText}>{t('no_assets')}</Text>
            <Text style={styles.emptySubtext}>{t('deposit_to_start')}</Text>
            <TouchableOpacity
              style={styles.emptyActionButton}
              onPress={navigateToDeposit}
            >
              <Text style={styles.emptyActionButtonText}>{t('deposit_now')}</Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6200ee']}
          />
        }
      />
    </View>
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
  balanceCard: {
    margin: 16,
    borderRadius: 8,
    elevation: 2,
  },
  balanceCardContent: {
    padding: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#757575',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  changeText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  positiveChange: {
    color: '#4caf50',
  },
  negativeChange: {
    color: '#f44336',
  },
  periodText: {
    fontSize: 12,
    color: '#757575',
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#6200ee',
  },
  actionIconContainer: {
    marginRight: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  chartCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  chartCardContent: {
    padding: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    padding: 2,
  },
  periodButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  selectedPeriodButton: {
    backgroundColor: '#6200ee',
  },
  periodButtonText: {
    fontSize: 12,
    color: '#757575',
  },
  selectedPeriodButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  assetsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  assetsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#757575',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9e9e9e',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyActionButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyActionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default WalletScreen;