import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getReferralCode } from '../../services/dataService';
import * as Clipboard from 'expo-clipboard';
import * as SecureStore from 'expo-secure-store';

const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const fetchReferralCode = async () => {
    try {
      setIsLoading(true);
      const code = await getReferralCode();
      setReferralCode(code);
    } catch (error) {
      console.error('Error fetching referral code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    // Only fetch referral code if the user is a contractor
    if (user?.isContractor) {
      fetchReferralCode();
    }
  }, [user]);

  const handleCopyReferralCode = async () => {
    if (referralCode) {
      await Clipboard.setStringAsync(referralCode);
      Alert.alert('Success', 'Referral code copied to clipboard');
    }
  };

  const handleToggleNotifications = (value: boolean) => {
    setNotificationsEnabled(value);
    // Save to persistent storage
    SecureStore.setItemAsync('notifications_enabled', value.toString());
  };

  const handleToggleBiometric = (value: boolean) => {
    setBiometricEnabled(value);
    // Save to persistent storage
    SecureStore.setItemAsync('biometric_enabled', value.toString());
  };

  const handleToggleDarkMode = (value: boolean) => {
    setDarkModeEnabled(value);
    // Save to persistent storage
    SecureStore.setItemAsync('dark_mode_enabled', value.toString());
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await logout();
            } catch (error) {
              console.error('Error logging out:', error);
              setIsLoading(false);
            }
          }
        },
      ]
    );
  };

  const handleNavigateToKYC = () => {
    Alert.alert('KYC Verification', 'The KYC verification process will be implemented soon.');
  };

  const handleNavigateToSecurity = () => {
    Alert.alert('Security', 'The security settings screen will be implemented soon.');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          <Text style={styles.profileImagePlaceholder}>
            {user?.username ? user.username[0].toUpperCase() : 'U'}
          </Text>
        </View>
        <Text style={styles.profileName}>{user?.username || 'User'}</Text>
        <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
        <Text style={styles.profileMemberSince}>
          Member since {formatDate(user?.createdAt)}
        </Text>
      </View>

      {user?.isContractor && (
        <View style={styles.referralContainer}>
          <Text style={styles.referralTitle}>Your Referral Code</Text>
          <View style={styles.referralCodeContainer}>
            <Text style={styles.referralCode}>{referralCode || 'Loading...'}</Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={handleCopyReferralCode}
              disabled={!referralCode}
            >
              <Ionicons name="copy-outline" size={20} color="#0066CC" />
            </TouchableOpacity>
          </View>
          <Text style={styles.referralInfo}>
            Share this code with others and earn commission on their deposits
          </Text>
        </View>
      )}

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleNavigateToKYC}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#333" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>KYC Verification</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleNavigateToSecurity}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="lock-closed-outline" size={22} color="#333" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Security</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="notifications-outline" size={22} color="#333" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: "#c5c5c5", true: "#4CAF50" }}
            thumbColor="#fff"
          />
        </View>
        
        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="finger-print-outline" size={22} color="#333" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Biometric Login</Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleToggleBiometric}
            trackColor={{ false: "#c5c5c5", true: "#4CAF50" }}
            thumbColor="#fff"
          />
        </View>
        
        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="moon-outline" size={22} color="#333" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Dark Mode</Text>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={handleToggleDarkMode}
            trackColor={{ false: "#c5c5c5", true: "#4CAF50" }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => Alert.alert('Help Center', 'The help center screen will be implemented soon.')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="help-circle-outline" size={22} color="#333" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Help Center</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => Alert.alert('Contact Support', 'The contact support screen will be implemented soon.')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#333" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Contact Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>

      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>EvokeEssence Exchange v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#0066CC',
  },
  profileImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImagePlaceholder: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
  },
  profileMemberSince: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  referralContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  referralCodeContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f8ff',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  referralCode: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  copyButton: {
    padding: 5,
  },
  referralInfo: {
    fontSize: 14,
    color: '#666',
  },
  sectionContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 10,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemIcon: {
    marginRight: 15,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  versionText: {
    color: '#999',
    fontSize: 14,
  },
});

export default ProfileScreen;