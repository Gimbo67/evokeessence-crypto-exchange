import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import PushNotificationService from '../../services/pushNotificationService';

const NotificationSettingsScreen = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  
  // Notification preferences
  const [preferences, setPreferences] = useState({
    verificationUpdates: true,
    marketAlerts: true,
    depositConfirmations: true,
    withdrawalConfirmations: true,
    securityAlerts: true,
  });

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    setIsLoading(true);
    try {
      // Check if push token exists to determine if push is enabled
      const token = await PushNotificationService.getNotificationPreferences();
      setIsPushEnabled(!!token);
      
      // Load user preferences
      const userPreferences = await PushNotificationService.getNotificationPreferences();
      if (userPreferences) {
        setPreferences(userPreferences);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      Alert.alert(
        'Error',
        'Could not load notification settings. Please try again later.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePushNotifications = async (value: boolean) => {
    if (!user?.id) {
      Alert.alert('Error', 'You need to be logged in to manage push notifications.');
      return;
    }

    setIsLoading(true);
    try {
      if (value) {
        // Enable push notifications
        const success = await PushNotificationService.registerForPushNotifications(user.id.toString());
        
        if (success) {
          setIsPushEnabled(true);
          Alert.alert(
            'Success',
            'Push notifications have been enabled. You will now receive updates about your account and transactions.'
          );
        } else {
          throw new Error('Failed to register for push notifications');
        }
      } else {
        // Disable push notifications
        const success = await PushNotificationService.unregisterPushNotifications();
        
        if (success) {
          setIsPushEnabled(false);
          Alert.alert(
            'Success',
            'Push notifications have been disabled.'
          );
        } else {
          throw new Error('Failed to unregister push notifications');
        }
      }
    } catch (error) {
      console.error('Error toggling push notifications:', error);
      Alert.alert(
        'Error',
        'There was a problem changing your push notification settings. Please try again later.'
      );
      // Reset to previous state
      setIsPushEnabled(!value);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePreference = async (key: keyof typeof preferences, value: boolean) => {
    setIsLoading(true);
    try {
      // Create updated preferences
      const updatedPreferences = {
        ...preferences,
        [key]: value,
      };
      
      // Update on server
      const success = await PushNotificationService.updateNotificationPreferences(updatedPreferences);
      
      if (success) {
        // Update local state
        setPreferences(updatedPreferences);
      } else {
        throw new Error('Failed to update notification preferences');
      }
    } catch (error) {
      console.error('Error updating notification preference:', error);
      Alert.alert(
        'Error',
        'Failed to update notification preference. Please try again later.'
      );
      // Reset to previous value
      setPreferences({
        ...preferences,
        [key]: !value,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading notification settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notification Settings</Text>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="notifications" size={60} color="#0066CC" style={styles.infoIcon} />
        <Text style={styles.infoTitle}>Stay Informed</Text>
        <Text style={styles.infoDescription}>
          Receive timely notifications about your account, transactions, and market movements.
          Customize your notification preferences below.
        </Text>
      </View>

      <View style={styles.settingsCard}>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications" size={24} color="#333" style={styles.settingIcon} />
            <View>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Enable to receive notifications on your device
              </Text>
            </View>
          </View>
          <Switch
            trackColor={{ false: '#d1d1d1', true: '#BDE4FF' }}
            thumbColor={isPushEnabled ? '#0066CC' : '#f4f3f4'}
            ios_backgroundColor="#d1d1d1"
            onValueChange={handleTogglePushNotifications}
            value={isPushEnabled}
            disabled={isLoading}
          />
        </View>

        {isPushEnabled && (
          <>
            <View style={styles.divider} />
            <Text style={styles.categorySectionTitle}>Notification Categories</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="shield-checkmark" size={24} color="#333" style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Verification Updates</Text>
                  <Text style={styles.settingDescription}>
                    Get notified about changes to your verification status
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: '#d1d1d1', true: '#BDE4FF' }}
                thumbColor={preferences.verificationUpdates ? '#0066CC' : '#f4f3f4'}
                ios_backgroundColor="#d1d1d1"
                onValueChange={(value) => handleTogglePreference('verificationUpdates', value)}
                value={preferences.verificationUpdates}
                disabled={isLoading}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="trending-up" size={24} color="#333" style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Market Alerts</Text>
                  <Text style={styles.settingDescription}>
                    Receive alerts about significant market movements
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: '#d1d1d1', true: '#BDE4FF' }}
                thumbColor={preferences.marketAlerts ? '#0066CC' : '#f4f3f4'}
                ios_backgroundColor="#d1d1d1"
                onValueChange={(value) => handleTogglePreference('marketAlerts', value)}
                value={preferences.marketAlerts}
                disabled={isLoading}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="arrow-down-circle" size={24} color="#333" style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Deposit Confirmations</Text>
                  <Text style={styles.settingDescription}>
                    Get notified when your deposits are confirmed
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: '#d1d1d1', true: '#BDE4FF' }}
                thumbColor={preferences.depositConfirmations ? '#0066CC' : '#f4f3f4'}
                ios_backgroundColor="#d1d1d1"
                onValueChange={(value) => handleTogglePreference('depositConfirmations', value)}
                value={preferences.depositConfirmations}
                disabled={isLoading}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="arrow-up-circle" size={24} color="#333" style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Withdrawal Confirmations</Text>
                  <Text style={styles.settingDescription}>
                    Get notified when your withdrawals are processed
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: '#d1d1d1', true: '#BDE4FF' }}
                thumbColor={preferences.withdrawalConfirmations ? '#0066CC' : '#f4f3f4'}
                ios_backgroundColor="#d1d1d1"
                onValueChange={(value) => handleTogglePreference('withdrawalConfirmations', value)}
                value={preferences.withdrawalConfirmations}
                disabled={isLoading}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="lock-closed" size={24} color="#333" style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Security Alerts</Text>
                  <Text style={styles.settingDescription}>
                    Get notified about security-related events
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: '#d1d1d1', true: '#BDE4FF' }}
                thumbColor={preferences.securityAlerts ? '#0066CC' : '#f4f3f4'}
                ios_backgroundColor="#d1d1d1"
                onValueChange={(value) => handleTogglePreference('securityAlerts', value)}
                value={preferences.securityAlerts}
                disabled={isLoading}
              />
            </View>
          </>
        )}

        <View style={styles.divider} />

        <View style={styles.securityNote}>
          <Ionicons name="information-circle-outline" size={24} color="#0066CC" />
          <Text style={styles.securityNoteText}>
            Even with notifications disabled, important security alerts may still be sent to your registered email address.
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.notificationHistoryButton}
        onPress={() => Alert.alert('Coming Soon', 'Notification history will be available in the next update.')}
      >
        <Text style={styles.notificationHistoryButtonText}>View Notification History</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#0066CC',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoIcon: {
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  infoDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    width: '90%',
  },
  categorySectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 15,
  },
  securityNote: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  securityNoteText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  notificationHistoryButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  notificationHistoryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NotificationSettingsScreen;