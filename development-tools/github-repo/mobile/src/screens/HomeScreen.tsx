import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Image,
  ActivityIndicator
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/apiClient';

// Define cryptocurrency type
interface Cryptocurrency {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  imageUrl: string;
}

const HomeScreen = ({ navigation }: any) => {
  // Fetch cryptocurrency data
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['marketPrices'],
    queryFn: async () => {
      const response = await api.market.getPrices();
      return response.data;
    }
  });

  const renderCryptoItem = ({ item }: { item: Cryptocurrency }) => {
    const isPositiveChange = item.change24h >= 0;
    
    return (
      <TouchableOpacity 
        style={styles.cryptoItem}
        onPress={() => navigation.navigate('CryptoDetail', { cryptoId: item.id })}
      >
        <View style={styles.cryptoInfo}>
          <Image 
            source={{ uri: item.imageUrl }} 
            style={styles.cryptoIcon} 
            defaultSource={require('../assets/placeholder-coin.png')}
          />
          <View>
            <Text style={styles.cryptoName}>{item.name}</Text>
            <Text style={styles.cryptoSymbol}>{item.symbol.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.cryptoPrice}>${item.price.toLocaleString()}</Text>
          <Text style={[
            styles.cryptoChange,
            isPositiveChange ? styles.positiveChange : styles.negativeChange
          ]}>
            {isPositiveChange ? '+' : ''}{item.change24h.toFixed(2)}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cryptocurrency Market</Text>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A8A" />
          <Text style={styles.loadingText}>Loading market data...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            There was an error fetching the latest market data.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={data?.cryptocurrencies || []}
          keyExtractor={(item) => item.id}
          renderItem={renderCryptoItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              colors={['#1E3A8A']}
            />
          }
          ListHeaderComponent={
            <View style={styles.marketOverview}>
              <Text style={styles.marketOverviewTitle}>Market Overview</Text>
              <Text style={styles.marketOverviewDescription}>
                Latest prices updated every 60 seconds
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No cryptocurrency data available</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  listContent: {
    padding: 16,
  },
  marketOverview: {
    marginBottom: 20,
  },
  marketOverviewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  marketOverviewDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  cryptoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cryptoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cryptoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  cryptoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  cryptoSymbol: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  cryptoPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  cryptoChange: {
    fontSize: 14,
    marginTop: 2,
  },
  positiveChange: {
    color: '#10B981',
  },
  negativeChange: {
    color: '#EF4444',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
});

export default HomeScreen;