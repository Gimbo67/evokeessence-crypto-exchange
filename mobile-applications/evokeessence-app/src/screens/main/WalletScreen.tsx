import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Wallet } from '../../types';
import { getWallets } from '../../services/dataService';

const WalletScreen = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalBalanceUSD, setTotalBalanceUSD] = useState(0);

  const fetchWallets = async () => {
    try {
      setIsLoading(true);
      const walletsData = await getWallets();
      setWallets(walletsData);
      
      // Calculate total balance in USD (simplified version)
      const total = walletsData.reduce((sum, wallet) => {
        let valueInUSD = wallet.balance;
        if (wallet.currency === 'BTC') {
          valueInUSD = wallet.balance * 42850.75; // Example BTC price
        } else if (wallet.currency === 'ETH') {
          valueInUSD = wallet.balance * 2340.89; // Example ETH price
        }
        return sum + valueInUSD;
      }, 0);
      
      setTotalBalanceUSD(total);
    } catch (error) {
      console.error('Error fetching wallets:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWallets();
  };

  const handleDeposit = (wallet: Wallet) => {
    if (wallet.address) {
      Alert.alert(
        `Deposit ${wallet.currency}`,
        `Send ${wallet.currency} to the following address:`,
        [
          {
            text: 'Copy Address',
            onPress: () => {
              Clipboard.setString(wallet.address || '');
              Alert.alert('Success', 'Address copied to clipboard');
            },
          },
          {
            text: 'Share',
            onPress: () => {
              Share.share({
                message: `My ${wallet.currency} address: ${wallet.address}`,
              });
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      Alert.alert('Error', 'No deposit address available');
    }
  };

  const handleWithdraw = (wallet: Wallet) => {
    Alert.alert(
      `Withdraw ${wallet.currency}`,
      `You are about to withdraw from your ${wallet.currency} wallet.`,
      [
        {
          text: 'Continue',
          onPress: () => {
            // Navigate to withdrawal screen
            Alert.alert('Info', 'Withdrawal functionality to be implemented');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const renderWalletItem = ({ item }: { item: Wallet }) => {
    let valueInUSD = item.balance;
    if (item.currency === 'BTC') {
      valueInUSD = item.balance * 42850.75; // Example BTC price
    } else if (item.currency === 'ETH') {
      valueInUSD = item.balance * 2340.89; // Example ETH price
    }

    return (
      <View style={styles.walletCard}>
        <View style={styles.walletHeader}>
          <View style={styles.currencyContainer}>
            <View style={styles.currencyIcon}>
              <Text style={styles.currencyIconText}>{item.currency.charAt(0)}</Text>
            </View>
            <Text style={styles.currencyName}>{item.currency}</Text>
          </View>
          <TouchableOpacity 
            style={styles.walletOptionsButton}
            onPress={() => Alert.alert('Options', 'Wallet options to be implemented')}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceValue}>
            {item.balance} {item.currency}
          </Text>
          <Text style={styles.balanceUSD}>{formatCurrency(valueInUSD)}</Text>
        </View>
        
        <View style={styles.walletActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDeposit(item)}
          >
            <Ionicons name="arrow-down-circle" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Deposit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleWithdraw(item)}
          >
            <Ionicons name="arrow-up-circle" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Withdraw</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => Alert.alert('Trade', 'Trading functionality to be implemented')}
          >
            <Ionicons name="swap-horizontal" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Trade</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Total Balance</Text>
        <Text style={styles.totalBalance}>{formatCurrency(totalBalanceUSD)}</Text>
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      ) : (
        <FlatList
          data={wallets}
          renderItem={renderWalletItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={50} color="#ccc" />
              <Text style={styles.emptyText}>No wallets found</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity 
        style={styles.addWalletButton}
        onPress={() => Alert.alert('Add Wallet', 'Wallet creation functionality to be implemented')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
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
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
  },
  totalBalance: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 20,
  },
  walletCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  currencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  currencyIconText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  currencyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  walletOptionsButton: {
    padding: 5,
  },
  balanceContainer: {
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  balanceUSD: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  walletActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  addWalletButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default WalletScreen;