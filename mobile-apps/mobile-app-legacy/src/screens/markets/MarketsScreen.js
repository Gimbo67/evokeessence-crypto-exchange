import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/apiClient';

const MarketsScreen = () => {
  const [marketData, setMarketData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'price', 'change'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc', 'desc'

  // Load market data
  const loadMarketData = async () => {
    try {
      const data = await apiClient.market.getPrices();
      setMarketData(data);
      filterAndSortData(data, searchQuery, sortBy, sortDirection);
      setError(null);
    } catch (error) {
      console.error('Error loading market data:', error);
      setError('Failed to load market data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadMarketData();
  };

  // Filter and sort data based on search query and sort options
  const filterAndSortData = (data, query, sort, direction) => {
    // First filter by search query
    let result = data;
    
    if (query) {
      const lowercaseQuery = query.toLowerCase();
      result = data.filter(coin => 
        coin.name.toLowerCase().includes(lowercaseQuery) || 
        coin.symbol.toLowerCase().includes(lowercaseQuery)
      );
    }
    
    // Then sort
    result = [...result].sort((a, b) => {
      if (sort === 'name') {
        return direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sort === 'price') {
        return direction === 'asc'
          ? parseFloat(a.price) - parseFloat(b.price)
          : parseFloat(b.price) - parseFloat(a.price);
      } else if (sort === 'change') {
        return direction === 'asc'
          ? parseFloat(a.change24h) - parseFloat(b.change24h)
          : parseFloat(b.change24h) - parseFloat(a.change24h);
      }
      return 0;
    });
    
    setFilteredData(result);
  };

  // Handle search
  const handleSearch = (text) => {
    setSearchQuery(text);
    filterAndSortData(marketData, text, sortBy, sortDirection);
  };

  // Handle sorting
  const handleSort = (sortType) => {
    if (sortBy === sortType) {
      // Toggle direction if same sort type is selected
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
      filterAndSortData(marketData, searchQuery, sortType, newDirection);
    } else {
      // New sort type, default to ascending
      setSortBy(sortType);
      setSortDirection('asc');
      filterAndSortData(marketData, searchQuery, sortType, 'asc');
    }
  };

  // Initial data loading
  useEffect(() => {
    loadMarketData();
  }, []);

  // Render a coin item
  const renderCoinItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.coinItem}
      onPress={() => {
        // In the future, this could navigate to a coin detail screen
        Alert.alert(`${item.name} Info`, `Current price: $${parseFloat(item.price).toFixed(2)}`);
      }}
    >
      <View style={styles.coinInfo}>
        <Text style={styles.coinName}>{item.name}</Text>
        <Text style={styles.coinSymbol}>{item.symbol.toUpperCase()}</Text>
      </View>
      <View style={styles.coinPriceContainer}>
        <Text style={styles.coinPrice}>
          ${parseFloat(item.price).toFixed(2)}
        </Text>
        <Text style={[
          styles.priceChange,
          parseFloat(item.change24h) >= 0 ? styles.priceIncrease : styles.priceDecrease
        ]}>
          {parseFloat(item.change24h) >= 0 ? '+' : ''}
          {parseFloat(item.change24h).toFixed(2)}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Get the sort indicator icon
  const getSortIcon = (currentSortBy) => {
    if (sortBy !== currentSortBy) return null;
    
    return (
      <Ionicons 
        name={sortDirection === 'asc' ? 'caret-up' : 'caret-down'} 
        size={14} 
        color="#6200ee"
        style={styles.sortIcon}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search cryptocurrencies..."
          value={searchQuery}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"
        />
      </View>
      
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'name' && styles.sortButtonActive]}
          onPress={() => handleSort('name')}
        >
          <Text style={[styles.sortButtonText, sortBy === 'name' && styles.sortButtonTextActive]}>
            Name
          </Text>
          {getSortIcon('name')}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'price' && styles.sortButtonActive]}
          onPress={() => handleSort('price')}
        >
          <Text style={[styles.sortButtonText, sortBy === 'price' && styles.sortButtonTextActive]}>
            Price
          </Text>
          {getSortIcon('price')}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'change' && styles.sortButtonActive]}
          onPress={() => handleSort('change')}
        >
          <Text style={[styles.sortButtonText, sortBy === 'change' && styles.sortButtonTextActive]}>
            24h Change
          </Text>
          {getSortIcon('change')}
        </TouchableOpacity>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading market data...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderCoinItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? `No cryptocurrencies found matching "${searchQuery}"`
                  : 'No cryptocurrency data available'}
              </Text>
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
    backgroundColor: '#f8f9fa',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  sortContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
    borderRadius: 8,
  },
  sortButtonActive: {
    backgroundColor: '#e0e0ff',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#333',
  },
  sortButtonTextActive: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  sortIcon: {
    marginLeft: 4,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
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
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  coinItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  coinInfo: {
    flex: 1,
  },
  coinName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  coinSymbol: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  coinPriceContainer: {
    alignItems: 'flex-end',
  },
  coinPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  priceChange: {
    fontSize: 14,
    marginTop: 4,
  },
  priceIncrease: {
    color: '#4caf50',
  },
  priceDecrease: {
    color: '#f44336',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default MarketsScreen;