import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Market } from '../../types';
import { getMarkets } from '../../services/dataService';

const MarketsScreen = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'change'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchMarkets = async () => {
    try {
      setIsLoading(true);
      const marketsData = await getMarkets();
      setMarkets(marketsData);
      setFilteredMarkets(marketsData);
    } catch (error) {
      console.error('Error fetching markets:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, []);

  useEffect(() => {
    // Filter markets based on search query
    if (searchQuery.trim() === '') {
      setFilteredMarkets(markets);
    } else {
      const filtered = markets.filter(
        (market) =>
          market.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          market.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMarkets(filtered);
    }
  }, [searchQuery, markets]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMarkets();
  };

  const handleSort = (type: 'name' | 'price' | 'change') => {
    if (sortBy === type) {
      // Toggle sort order if same type is selected
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort type and reset to ascending order
      setSortBy(type);
      setSortOrder('asc');
    }

    const sorted = [...filteredMarkets].sort((a, b) => {
      let comparison = 0;
      
      if (type === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (type === 'price') {
        comparison = a.price - b.price;
      } else if (type === 'change') {
        comparison = a.change24h - b.change24h;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    setFilteredMarkets(sorted);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const renderMarketItem = ({ item }: { item: Market }) => {
    const isPositive = item.change24h >= 0;
    return (
      <TouchableOpacity style={styles.marketItem}>
        <View style={styles.marketItemLeft}>
          <Text style={styles.marketName}>{item.name}</Text>
          <Text style={styles.marketSymbol}>{item.symbol}</Text>
        </View>
        <View style={styles.marketItemRight}>
          <Text style={styles.marketPrice}>{formatCurrency(item.price)}</Text>
          <Text
            style={[
              styles.marketChange,
              isPositive ? styles.positiveChange : styles.negativeChange,
            ]}
          >
            {isPositive ? '+' : ''}{item.change24h.toFixed(2)}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search markets..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[
            styles.sortButton,
            sortBy === 'name' && styles.activeSortButton,
          ]}
          onPress={() => handleSort('name')}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortBy === 'name' && styles.activeSortButtonText,
            ]}
          >
            Name
          </Text>
          {sortBy === 'name' && (
            <Ionicons
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={sortBy === 'name' ? '#0066CC' : '#666'}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sortButton,
            sortBy === 'price' && styles.activeSortButton,
          ]}
          onPress={() => handleSort('price')}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortBy === 'price' && styles.activeSortButtonText,
            ]}
          >
            Price
          </Text>
          {sortBy === 'price' && (
            <Ionicons
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={sortBy === 'price' ? '#0066CC' : '#666'}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.sortButton,
            sortBy === 'change' && styles.activeSortButton,
          ]}
          onPress={() => handleSort('change')}
        >
          <Text
            style={[
              styles.sortButtonText,
              sortBy === 'change' && styles.activeSortButtonText,
            ]}
          >
            Change
          </Text>
          {sortBy === 'change' && (
            <Ionicons
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={sortBy === 'change' ? '#0066CC' : '#666'}
            />
          )}
        </TouchableOpacity>
      </View>

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading markets...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMarkets}
          renderItem={renderMarketItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={50} color="#ccc" />
              <Text style={styles.emptyText}>
                No markets found for "{searchQuery}"
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  clearButton: {
    padding: 5,
  },
  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
  },
  activeSortButton: {
    backgroundColor: '#e6f0ff',
  },
  sortButtonText: {
    fontSize: 14,
    marginRight: 5,
    color: '#666',
  },
  activeSortButtonText: {
    color: '#0066CC',
    fontWeight: '600',
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
  marketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  marketItemLeft: {
    flex: 1,
  },
  marketName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  marketSymbol: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  marketItemRight: {
    alignItems: 'flex-end',
  },
  marketPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  marketChange: {
    fontSize: 14,
    marginTop: 4,
  },
  positiveChange: {
    color: '#4CAF50',
  },
  negativeChange: {
    color: '#F44336',
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
});

export default MarketsScreen;