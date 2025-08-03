import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { Card, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    verified: false,
    isContractor: false,
    referralCode: '',
    twoFactorEnabled: false
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  // Fetch user data
  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setUserData(response.data.user);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    
    // Load notification settings
    const loadSettings = async () => {
      try {
        const notificationSetting = await AsyncStorage.getItem('notifications_enabled');
        const biometricSetting = await AsyncStorage.getItem('biometrics_enabled');
        
        if (notificationSetting !== null) {
          setNotificationsEnabled(notificationSetting === 'true');
        }
        
        if (biometricSetting !== null) {
          setBiometricsEnabled(biometricSetting === 'true');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  // Handle toggle notification setting
  const handleToggleNotifications = async (value) => {
    setNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem('notifications_enabled', value.toString());
    } catch (error) {
      console.error('Error saving notification setting:', error);
    }
  };

  // Handle toggle biometrics setting
  const handleToggleBiometrics = async (value) => {
    setBiometricsEnabled(value);
    try {
      await AsyncStorage.setItem('biometrics_enabled', value.toString());
    } catch (error) {
      console.error('Error saving biometrics setting:', error);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const token = await AsyncStorage.getItem('auth_token');
              
              // Call logout API
              await axios.post(
                `${API_URL}/api/auth/logout`,
                {},
                {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                }
              );
              
              // Clear stored tokens and user data
              await AsyncStorage.removeItem('auth_token');
              await AsyncStorage.removeItem('user_type');
              
              // Navigate to login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error logging out:', error);
              
              // If API call fails, still clear local storage and redirect
              await AsyncStorage.removeItem('auth_token');
              await AsyncStorage.removeItem('user_type');
              
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {userData.firstName 
              ? userData.firstName.charAt(0).toUpperCase() 
              : userData.username.charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <Text style={styles.username}>{userData.username}</Text>
        <Text style={styles.email}>{userData.email}</Text>
        
        <View style={styles.badgeContainer}>
          {userData.verified && (
            <View style={styles.badge}>
              <Ionicons name="checkmark-circle" size={14} color="#fff" />
              <Text style={styles.badgeText}>Verified</Text>
            </View>
          )}
          
          {userData.isContractor && (
            <View style={[styles.badge, styles.contractorBadge]}>
              <Ionicons name="briefcase" size={14} color="#fff" />
              <Text style={styles.badgeText}>Contractor</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
      
      {userData.isContractor && (
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="people" size={22} color="#6200ee" />
            <Text style={styles.cardTitle}>Your Referral Program</Text>
          </View>
          
          <View style={styles.referralInfo}>
            <Text style={styles.referralLabel}>Your Referral Code</Text>
            <View style={styles.referralCodeContainer}>
              <Text style={styles.referralCode}>{userData.referralCode}</Text>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={() => {
                  Alert.alert('Copied!', 'Referral code copied to clipboard');
                }}
              >
                <Ionicons name="copy-outline" size={18} color="#6200ee" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.referralHint}>
              Share this code with others to earn commission on their deposits
            </Text>
            
            <TouchableOpacity 
              style={styles.viewStatsButton}
              onPress={() => navigation.navigate('ContractorHome')}
            >
              <Text style={styles.viewStatsText}>View Referral Stats</Text>
              <Ionicons name="chevron-forward" size={16} color="#6200ee" />
            </TouchableOpacity>
          </View>
        </Card>
      )}
      
      <Card style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark" size={22} color="#6200ee" />
          <Text style={styles.cardTitle}>Security</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="lock-closed-outline" size={22} color="#616161" style={styles.menuIcon} />
            <Text style={styles.menuText}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9e9e9e" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('TwoFactorSetup')}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="finger-print-outline" size={22} color="#616161" style={styles.menuIcon} />
            <Text style={styles.menuText}>Two-Factor Authentication</Text>
          </View>
          <View style={styles.twoFactorStatus}>
            <Text style={styles.statusText}>
              {userData.twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </Text>
            <Ionicons 
              name={userData.twoFactorEnabled ? 'checkmark-circle' : 'close-circle'} 
              size={16} 
              color={userData.twoFactorEnabled ? '#4caf50' : '#f44336'} 
            />
          </View>
        </TouchableOpacity>
        
        <View style={styles.menuItem}>
          <View style={styles.menuItemContent}>
            <Ionicons name="scan-outline" size={22} color="#616161" style={styles.menuIcon} />
            <Text style={styles.menuText}>Enable Biometric Login</Text>
          </View>
          <Switch
            value={biometricsEnabled}
            onValueChange={handleToggleBiometrics}
            trackColor={{ false: '#e0e0e0', true: '#ba86fc' }}
            thumbColor={biometricsEnabled ? '#6200ee' : '#f5f5f5'}
          />
        </View>
      </Card>
      
      <Card style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="notifications" size={22} color="#6200ee" />
          <Text style={styles.cardTitle}>Preferences</Text>
        </View>
        
        <View style={styles.menuItem}>
          <View style={styles.menuItemContent}>
            <Ionicons name="notifications-outline" size={22} color="#616161" style={styles.menuIcon} />
            <Text style={styles.menuText}>Push Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#e0e0e0', true: '#ba86fc' }}
            thumbColor={notificationsEnabled ? '#6200ee' : '#f5f5f5'}
          />
        </View>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('Language')}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="language-outline" size={22} color="#616161" style={styles.menuIcon} />
            <Text style={styles.menuText}>Language</Text>
          </View>
          <View style={styles.languageIndicator}>
            <Text style={styles.languageText}>English</Text>
            <Ionicons name="chevron-forward" size={18} color="#9e9e9e" />
          </View>
        </TouchableOpacity>
      </Card>
      
      <Card style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <Ionicons name="information-circle" size={22} color="#6200ee" />
          <Text style={styles.cardTitle}>About</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('Help')}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="help-circle-outline" size={22} color="#616161" style={styles.menuIcon} />
            <Text style={styles.menuText}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9e9e9e" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('PrivacyPolicy')}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="document-text-outline" size={22} color="#616161" style={styles.menuIcon} />
            <Text style={styles.menuText}>Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9e9e9e" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('TermsOfService')}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="shield-outline" size={22} color="#616161" style={styles.menuIcon} />
            <Text style={styles.menuText}>Terms of Service</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9e9e9e" />
        </TouchableOpacity>
        
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>App Version: 1.0.0</Text>
        </View>
      </Card>
      
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
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
  profileSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 16,
    color: '#757575',
    marginTop: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4caf50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  contractorBadge: {
    backgroundColor: '#ff9800',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  editButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#6200ee',
    borderRadius: 20,
  },
  editButtonText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  referralInfo: {
    padding: 16,
  },
  referralLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  referralCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    padding: 12,
  },
  referralCode: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  copyButton: {
    padding: 4,
  },
  referralHint: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
  },
  viewStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  viewStatsText: {
    color: '#6200ee',
    fontWeight: 'bold',
    marginRight: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
  },
  twoFactorStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    marginRight: 4,
  },
  languageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageText: {
    fontSize: 14,
    color: '#757575',
    marginRight: 4,
  },
  versionInfo: {
    padding: 16,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#9e9e9e',
  },
  logoutButton: {
    backgroundColor: '#f44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ProfileScreen;