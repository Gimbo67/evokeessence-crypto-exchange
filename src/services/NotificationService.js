import { Platform, Alert, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../api/config';
import ApiService from '../api/apiClient';

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.onNotificationReceivedCallback = null;
    this.onNotificationResponseCallback = null;
  }

  // Initialize notification service
  async initialize(onNotificationReceived, onNotificationResponse) {
    if (this.isInitialized) return;

    // Save callbacks
    this.onNotificationReceivedCallback = onNotificationReceived;
    this.onNotificationResponseCallback = onNotificationResponse;

    // Check if physical device
    if (!Device.isDevice) {
      Alert.alert(
        'Push Notifications',
        'Push notifications are not available in the simulator',
        [{ text: 'OK' }]
      );
      return;
    }

    // Configure notifications (iOS)
    if (Platform.OS === 'ios') {
      await this.configureIOS();
    }

    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true
      }),
    });

    // Get push token
    await this.registerForPushNotifications();

    // Set up notification listeners
    this.setupNotificationListeners();

    this.isInitialized = true;
  }

  // Configure iOS-specific settings
  async configureIOS() {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // If we don't have permission, request it
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      finalStatus = status;
    }

    // If permission is still not granted, alert the user
    if (finalStatus !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Push notifications are disabled. Would you like to open the settings to enable them?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    // Set up categories for actionable notifications
    await Notifications.setNotificationCategoryAsync('PRICE_ALERT', [
      {
        identifier: 'VIEW_DETAILS',
        buttonTitle: 'View Details',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('TRANSACTION', [
      {
        identifier: 'VIEW_TRANSACTION',
        buttonTitle: 'View Transaction',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('VERIFICATION', [
      {
        identifier: 'CHECK_STATUS',
        buttonTitle: 'Check Status',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);
  }

  // Register for push notifications
  async registerForPushNotifications() {
    try {
      // Check if we already have a token
      const existingToken = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_TOKEN);
      if (existingToken) {
        this.expoPushToken = existingToken;
        return;
      }

      // Get push token from Expo
      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      this.expoPushToken = token;

      // Save token locally
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_TOKEN, token);

      // Register with the server if user is authenticated
      const authToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (authToken) {
        const enabled = await this.getNotificationsEnabled();
        await ApiService.registerDevice(token, Platform.OS, enabled);
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  }

  // Set up notification listeners
  setupNotificationListeners() {
    // Remove existing listeners if they exist
    this.removeNotificationListeners();

    // Set up notification received listener
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      if (this.onNotificationReceivedCallback) {
        this.onNotificationReceivedCallback(notification);
      }
    });

    // Set up notification response listener
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      if (this.onNotificationResponseCallback) {
        this.onNotificationResponseCallback(response);
      }
    });
  }

  // Remove notification listeners
  removeNotificationListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }

    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
  }

  // Get notification badge count
  async getBadgeCount() {
    return await Notifications.getBadgeCountAsync();
  }

  // Set notification badge count
  async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }

  // Clear all notifications
  async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
    await this.setBadgeCount(0);
  }

  // Toggle notifications enabled/disabled
  async toggleNotifications(enabled) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, enabled.toString());

      const authToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (authToken && this.expoPushToken) {
        await ApiService.togglePushNotifications(enabled);
      }

      return true;
    } catch (error) {
      console.error('Error toggling notifications:', error);
      return false;
    }
  }

  // Get notification enabled status
  async getNotificationsEnabled() {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
    return value !== 'false'; // Default to true if not set
  }

  // Update device token
  async updateDeviceToken(newToken) {
    try {
      const oldToken = this.expoPushToken;
      this.expoPushToken = newToken;

      // Save new token locally
      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_TOKEN, newToken);

      // Update token on server if user is authenticated
      const authToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (authToken && oldToken) {
        await ApiService.updateDeviceToken(oldToken, newToken);
      }

      return true;
    } catch (error) {
      console.error('Error updating device token:', error);
      return false;
    }
  }

  // Schedule a local notification
  async scheduleLocalNotification(title, body, data = {}, trigger = null) {
    try {
      const notificationContent = {
        title,
        body,
        data,
        sound: true,
        badge: 1,
      };

      if (data.category) {
        notificationContent.categoryIdentifier = data.category;
      }

      // Default trigger is immediate
      const notificationTrigger = trigger || null;

      // Schedule the notification
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: notificationTrigger,
      });

      return true;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      return false;
    }
  }

  // Get all scheduled notifications
  async getScheduledNotifications() {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Cancel a specific notification
  async cancelNotification(notificationIdentifier) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationIdentifier);
      return true;
    } catch (error) {
      console.error('Error canceling notification:', error);
      return false;
    }
  }

  // Parse received notification response
  parseNotificationResponse(response) {
    const notification = response.notification;
    const actionIdentifier = response.actionIdentifier;
    
    return {
      id: notification.request.identifier,
      title: notification.request.content.title,
      body: notification.request.content.body,
      data: notification.request.content.data,
      category: notification.request.content.categoryIdentifier,
      action: actionIdentifier,
      userInteraction: response.userInteraction,
    };
  }

  // Handle notification received in app
  async handleNotificationReceived(notification) {
    // Update badge count
    const currentBadgeCount = await this.getBadgeCount();
    await this.setBadgeCount(currentBadgeCount + 1);

    // Process different notification types based on the category
    const category = notification.request?.content?.categoryIdentifier;
    const data = notification.request?.content?.data || {};

    switch (category) {
      case 'PRICE_ALERT':
        // Handle price alert
        break;
      case 'TRANSACTION':
        // Handle transaction notification
        break;
      case 'VERIFICATION':
        // Handle verification status change
        break;
    }
  }

  // Handle notification response (user tapped)
  async handleNotificationResponse(response) {
    const parsedResponse = this.parseNotificationResponse(response);
    const data = parsedResponse.data || {};
    const category = parsedResponse.category;
    const action = parsedResponse.action;

    // Reset badge count when app is opened via notification
    await this.setBadgeCount(0);

    // Handle different notification categories and actions
    switch (category) {
      case 'PRICE_ALERT':
        if (action === 'VIEW_DETAILS' && data.coinId) {
          // Navigate to coin details
          return {
            screen: 'CoinDetails',
            params: { coinId: data.coinId }
          };
        }
        break;
      
      case 'TRANSACTION':
        if (action === 'VIEW_TRANSACTION' && data.transactionId) {
          // Navigate to transaction details
          return {
            screen: 'TransactionDetails',
            params: { transactionId: data.transactionId }
          };
        }
        break;
      
      case 'VERIFICATION':
        if (action === 'CHECK_STATUS') {
          // Navigate to verification status screen
          return {
            screen: 'VerificationStatus'
          };
        }
        break;
      
      default:
        // Default behavior for other types or when no specific action
        if (data.screen) {
          return {
            screen: data.screen,
            params: data.params || {}
          };
        }
    }

    return null;
  }

  // Clean up when service is no longer needed
  cleanup() {
    this.removeNotificationListeners();
    this.isInitialized = false;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;