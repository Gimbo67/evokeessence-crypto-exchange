import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../../api/config';

const MarketsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marketData, setMarketData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'market_cap', direction: 'desc' });

  const fetchMarketData = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/market/prices`);
      if (response.data && response.data.success) {
        const data = response.data.prices;
        setMarketData(data);
        setFilteredData(data);
        sortData(data, sortConfig.key, sortConfig.direction);
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMarketData();
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredData(marketData);
    } else {
      const filtered = marketData.filter(
        coin => 
          coin.name.toLowerCase().includes(text.toLowerCase()) ||
          coin.symbol.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredData(filtered);
    }
  };

  const sortData = (data, key, direction) => {
    const sortedData = [...data].sort((a, b) => {
      if (a[key] < b[key]) {
        return direction === 'asc' ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredData(sortedData);
    setSortConfig({ key, direction });
  };

  const toggleSortDirection = (key) => {
    const direction = 
      sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc';
    sortData(filteredData, key, direction);
  };

  const viewCoinDetails = (coin) => {
    navigation.navigate('CoinDetails', { coin });
  };

  const renderCoinItem = ({ item }) => (
    <TouchableOpacity onPress={() => viewCoinDetails(item)}>
      <Card style={styles.coinCard}>
        <View style={styles.coinCardContent}>
          <View style={styles.coinBasicInfo}>
            <Image
              source={{ uri: item.image }}
              style={styles.coinIcon}
              defaultSource={require('../../assets/placeholder-coin.png')}
            />
            <View>
              <Text style={styles.coinName}>{item.name}</Text>
              <Text style={styles.coinSymbol}>{item.symbol.toUpperCase()}</Text>
            </View>
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.coinPrice}>€{item.current_price.toFixed(2)}</Text>
            <Text style={[
              styles.priceChange,
              item.price_change_percentage_24h >= 0 ? styles.priceUp : styles.priceDown
            ]}>
              <Ionicons 
                name={item.price_change_percentage_24h >= 0 ? 'caret-up' : 'caret-down'} 
                size={16} 
              />
              {Math.abs(item.price_change_percentage_24h).toFixed(2)}%
            </Text>
          </View>
          
          <View style={styles.marketCapContainer}>
            <Text style={styles.marketCapLabel}>Market Cap</Text>
            <Text style={styles.marketCapValue}>€{formatMarketCap(item.market_cap)}</Text>
          </View>
          
          <View style={styles.arrowContainer}>
            <Ionicons name="chevron-forward" size={20} color="#9e9e9e" />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const formatMarketCap = (value) => {
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(2) + 'B';
    } else if (value >= 1000000) {
      return (value / 1000000).toFixed(2) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(2) + 'K';
    }
    return value.toString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Markets</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#757575" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search coins..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>
      
      <View style={styles.sortContainer}>
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={() => toggleSortDirection('name')}
        >
          <Text style={[
            styles.sortButtonText,
            sortConfig.key === 'name' && styles.activeSortButton
          ]}>
            Name
            {sortConfig.key === 'name' && (
              <Ionicons 
                name={sortConfig.direction === 'asc' ? 'caret-up' : 'caret-down'} 
                size={16} 
              />
            )}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={() => toggleSortDirection('current_price')}
        >
          <Text style={[
            styles.sortButtonText,
            sortConfig.key === 'current_price' && styles.activeSortButton
          ]}>
            Price
            {sortConfig.key === 'current_price' && (
              <Ionicons 
                name={sortConfig.direction === 'asc' ? 'caret-up' : 'caret-down'} 
                size={16} 
              />
            )}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={() => toggleSortDirection('price_change_percentage_24h')}
        >
          <Text style={[
            styles.sortButtonText,
            sortConfig.key === 'price_change_percentage_24h' && styles.activeSortButton
          ]}>
            24h
            {sortConfig.key === 'price_change_percentage_24h' && (
              <Ionicons 
                name={sortConfig.direction === 'asc' ? 'caret-up' : 'caret-down'} 
                size={16} 
              />
            )}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={() => toggleSortDirection('market_cap')}
        >
          <Text style={[
            styles.sortButtonText,
            sortConfig.key === 'market_cap' && styles.activeSortButton
          ]}>
            Market Cap
            {sortConfig.key === 'market_cap' && (
              <Ionicons 
                name={sortConfig.direction === 'asc' ? 'caret-up' : 'caret-down'} 
                size={16} 
              />
            )}
          </Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={filteredData}
        renderItem={renderCoinItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6200ee']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={64} color="#bdbdbd" />
            <Text style={styles.emptyText}>No coins found</Text>
            <Text style={styles.emptySubText}>
              Try a different search term or check your internet connection
            </Text>
          </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
  },
  sortContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#616161',
  },
  activeSortButton: {
    fontWeight: 'bold',
    color: '#6200ee',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  coinCard: {
    marginBottom: 8,
    borderRadius: 8,
  },
  coinCardContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coinBasicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  coinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  coinName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  coinSymbol: {
    fontSize: 12,
    color: '#757575',
  },
  priceContainer: {
    flex: 1.5,
    alignItems: 'flex-end',
  },
  coinPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  priceChange: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  priceUp: {
    color: '#4caf50',
  },
  priceDown: {
    color: '#f44336',
  },
  marketCapContainer: {
    flex: 1.5,
    alignItems: 'flex-end',
  },
  marketCapLabel: {
    fontSize: 12,
    color: '#757575',
  },
  marketCapValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  arrowContainer: {
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#757575',
  },
  emptySubText: {
    fontSize: 14,
    color: '#9e9e9e',
    marginTop: 4,
    textAlign: 'center',
    marginHorizontal: 24,
  },
});

export default MarketsScreen;