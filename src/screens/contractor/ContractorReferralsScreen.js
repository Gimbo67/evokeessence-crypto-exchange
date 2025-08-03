import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Share
} from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ContractorReferralsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [referrals, setReferrals] = useState([]);
  const [filteredReferrals, setFilteredReferrals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [referralCode, setReferralCode] = useState('');

  // Fetch referrals list
  const fetchReferrals = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/contractor/referrals`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setReferrals(response.data.referrals);
        applyFilters(response.data.referrals, searchQuery, filter);
      }
      
      // Get user's referral code
      const profileResponse = await axios.get(`${API_URL}/api/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (profileResponse.data && profileResponse.data.success) {
        setReferralCode(profileResponse.data.user.referralCode);
      }
    } catch (error) {
      console.error('Error fetching referrals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReferrals();
  };

  // Apply search and filters
  const applyFilters = (referralsArray, query, filterType) => {
    let result = [...referralsArray];
    
    // Apply text search
    if (query) {
      result = result.filter(
        referral => 
          referral.username.toLowerCase().includes(query.toLowerCase()) ||
          referral.email.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    // Apply type filter
    if (filterType === 'active') {
      result = result.filter(referral => referral.depositCount > 0);
    } else if (filterType === 'pending') {
      result = result.filter(referral => referral.depositCount === 0);
    }
    
    setFilteredReferrals(result);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(referrals, text, filter);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    applyFilters(referrals, searchQuery, newFilter);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return '€' + amount.toFixed(2);
  };

  // Share referral code
  const shareReferralCode = async () => {
    try {
      await Share.share({
        message: `Use my referral code ${referralCode} when signing up at EvokeEssence Crypto Exchange to get special benefits!`,
        title: 'Join EvokeEssence Crypto Exchange',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share referral code');
    }
  };

  const renderReferralItem = ({ item }) => (
    <Card 
      style={styles.referralCard}
      onPress={() => navigation.navigate('ReferralDetails', { referralId: item.id })}
    >
      <View style={styles.referralCardContent}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {item.username ? item.username.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          
          <View style={styles.userData}>
            <Text style={styles.userName}>{item.username}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            <Text style={styles.userJoinDate}>
              Joined: {new Date(item.joinedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        <View style={styles.referralStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Deposits</Text>
            <Text style={styles.statValue}>{item.depositCount}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Amount</Text>
            <Text style={styles.statValue}>{formatCurrency(item.totalAmount)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Commission</Text>
            <Text style={styles.statValue}>{formatCurrency(item.commission)}</Text>
          </View>
        </View>
        
        <View style={styles.referralActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="chevron-forward" size={24} color="#6200ee" />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

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
        <Text style={styles.headerTitle}>My Referrals</Text>
      </View>
      
      <View style={styles.referralCodeSection}>
        <Card style={styles.referralCodeCard}>
          <View style={styles.referralCodeContent}>
            <View>
              <Text style={styles.referralLabel}>Your Referral Code</Text>
              <Text style={styles.referralCodeText}>{referralCode}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={shareReferralCode}
            >
              <Ionicons name="share-social" size={20} color="#fff" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#757575" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search referrals..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>
      
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            filter === 'all' && styles.activeFilter
          ]}
          onPress={() => handleFilterChange('all')}
        >
          <Text style={[
            styles.filterText,
            filter === 'all' && styles.activeFilterText
          ]}>All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            filter === 'active' && styles.activeFilter
          ]}
          onPress={() => handleFilterChange('active')}
        >
          <Text style={[
            styles.filterText,
            filter === 'active' && styles.activeFilterText
          ]}>Active</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            filter === 'pending' && styles.activeFilter
          ]}
          onPress={() => handleFilterChange('pending')}
        >
          <Text style={[
            styles.filterText,
            filter === 'pending' && styles.activeFilterText
          ]}>Pending</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={filteredReferrals}
        renderItem={renderReferralItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.referralsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6200ee']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#bdbdbd" />
            <Text style={styles.emptyText}>
              {filter !== 'all' 
                ? `No ${filter} referrals found` 
                : 'No referrals yet'}
            </Text>
            <Text style={styles.emptySubText}>
              {filter !== 'all'
                ? 'Try a different filter'
                : 'Share your referral code to invite users'}
            </Text>
            
            {filter === 'all' && (
              <TouchableOpacity 
                style={styles.inviteButton}
                onPress={shareReferralCode}
              >
                <Text style={styles.inviteButtonText}>Invite Users</Text>
              </TouchableOpacity>
            )}
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
  referralCodeSection: {
    padding: 16,
  },
  referralCodeCard: {
    borderRadius: 8,
  },
  referralCodeContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  referralLabel: {
    fontSize: 14,
    color: '#757575',
  },
  referralCodeText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  shareButton: {
    backgroundColor: '#6200ee',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
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
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  activeFilter: {
    backgroundColor: '#6200ee',
  },
  filterText: {
    fontSize: 14,
    color: '#616161',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  referralsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  referralCard: {
    marginBottom: 12,
    borderRadius: 8,
  },
  referralCardContent: {
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  userData: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
    color: '#757575',
  },
  userJoinDate: {
    fontSize: 12,
    color: '#9e9e9e',
    marginTop: 2,
  },
  referralStats: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  referralActions: {
    alignItems: 'flex-end',
  },
  actionButton: {
    padding: 4,
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
    marginTop: 8,
    textAlign: 'center',
  },
  inviteButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 16,
  },
  inviteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ContractorReferralsScreen;