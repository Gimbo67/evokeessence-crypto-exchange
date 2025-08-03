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
  Alert
} from 'react-native';
import { Card, Badge } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AdminUsersScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState(route?.params?.filter || 'all');

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setUsers(response.data.users);
        applyFilters(response.data.users, searchQuery, filter);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to load users. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (route?.params?.filter) {
      setFilter(route.params.filter);
      applyFilters(users, searchQuery, route.params.filter);
    }
  }, [route?.params?.filter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const applyFilters = (usersArray, query, filterType) => {
    let result = [...usersArray];
    
    // Apply text search
    if (query) {
      result = result.filter(user => 
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase()) ||
        (user.firstName && user.firstName.toLowerCase().includes(query.toLowerCase())) ||
        (user.lastName && user.lastName.toLowerCase().includes(query.toLowerCase()))
      );
    }
    
    // Apply type filter
    if (filterType === 'contractors') {
      result = result.filter(user => user.isContractor);
    } else if (filterType === 'unverified') {
      result = result.filter(user => !user.verified);
    } else if (filterType === 'verified') {
      result = result.filter(user => user.verified);
    }
    
    setFilteredUsers(result);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    applyFilters(users, text, filter);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    applyFilters(users, searchQuery, newFilter);
  };

  const viewUserDetails = (userId) => {
    navigation.navigate('UserDetails', { userId });
  };

  const toggleUserVerification = async (userId, currentStatus) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.put(
        `${API_URL}/api/admin/users/${userId}/verify`,
        { verified: !currentStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data && response.data.success) {
        // Update local state
        const updatedUsers = users.map(user => {
          if (user.id === userId) {
            return { ...user, verified: !currentStatus };
          }
          return user;
        });
        
        setUsers(updatedUsers);
        applyFilters(updatedUsers, searchQuery, filter);
        
        Alert.alert(
          'Success', 
          `User ${!currentStatus ? 'verified' : 'unverified'} successfully`
        );
      }
    } catch (error) {
      console.error('Error updating user verification:', error);
      Alert.alert('Error', 'Failed to update user verification status');
    }
  };

  const renderUserItem = ({ item }) => (
    <Card 
      style={styles.userCard}
      onPress={() => viewUserDetails(item.id)}
    >
      <View style={styles.userCardContent}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatarContainer}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {item.firstName ? item.firstName.charAt(0) : item.username.charAt(0)}
              </Text>
            </View>
            
            {item.isContractor && (
              <Badge 
                style={styles.contractorBadge}
                size={16}
              >C</Badge>
            )}
          </View>
          
          <View style={styles.userData}>
            <Text style={styles.userName}>
              {item.firstName && item.lastName ? 
                `${item.firstName} ${item.lastName}` : item.username}
            </Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            <View style={styles.userStatusContainer}>
              <View style={[
                styles.statusIndicator, 
                { backgroundColor: item.verified ? '#4caf50' : '#ff9800' }
              ]} />
              <Text style={styles.userStatus}>
                {item.verified ? 'Verified' : 'Unverified'}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.userActions}>
          <TouchableOpacity 
            style={[
              styles.verifyButton, 
              { backgroundColor: item.verified ? '#f44336' : '#4caf50' }
            ]}
            onPress={() => toggleUserVerification(item.id, item.verified)}
          >
            <Ionicons 
              name={item.verified ? 'close-circle' : 'checkmark-circle'} 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.verifyButtonText}>
              {item.verified ? 'Unverify' : 'Verify'}
            </Text>
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
        <Text style={styles.headerTitle}>Users Management</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddUser')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#757575" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
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
            filter === 'verified' && styles.activeFilter
          ]}
          onPress={() => handleFilterChange('verified')}
        >
          <Text style={[
            styles.filterText,
            filter === 'verified' && styles.activeFilterText
          ]}>Verified</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            filter === 'unverified' && styles.activeFilter
          ]}
          onPress={() => handleFilterChange('unverified')}
        >
          <Text style={[
            styles.filterText,
            filter === 'unverified' && styles.activeFilterText
          ]}>Unverified</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            filter === 'contractors' && styles.activeFilter
          ]}
          onPress={() => handleFilterChange('contractors')}
        >
          <Text style={[
            styles.filterText,
            filter === 'contractors' && styles.activeFilterText
          ]}>Contractors</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.usersList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6200ee']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="person-outline" size={64} color="#bdbdbd" />
            <Text style={styles.emptyText}>No users found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search term' : 'Users will appear here'}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
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
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
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
  usersList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  userCard: {
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  userCardContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  contractorBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#ff9800',
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
    marginTop: 2,
  },
  userStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  userStatus: {
    fontSize: 12,
    color: '#616161',
  },
  userActions: {
    marginLeft: 8,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
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
  emptySubtext: {
    fontSize: 14,
    color: '#9e9e9e',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default AdminUsersScreen;