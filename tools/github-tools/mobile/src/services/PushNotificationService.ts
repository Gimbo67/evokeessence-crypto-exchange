import { Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/apiClient';

/**
 * Service to handle push notifications for the EvokeEssence Exchange mobile app
 */
class PushNotificationService {
  private deviceToken: string | null = null;
  private deviceId: string | null = null;
  
  /**
   * Initialize push notification service
   */
  initialize() {
    // Configure the notification service
    PushNotification.configure({
      // Called when a remote or local notification is opened
      onNotification: this.onNotification.bind(this),
      
      // Called when Token is generated
      onRegister: this.onRegister.bind(this),
      
      // IOS ONLY
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      
      // Should the initial notification be popped automatically
      popInitialNotification: true,
      
      // Request permissions on iOS
      requestPermissions: true,
    });
    
    // Create default notification channel for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'default-channel',
          channelName: 'Default Channel',
          channelDescription: 'Default notification channel',
          soundName: 'default',
          importance: 4, // High importance
          vibrate: true,
        },
        (created) => console.log(`Channel created: ${created}`)
      );
    }
    
    // Load saved device info
    this.loadDeviceInfo();
  }
  
  /**
   * Load device information from storage
   */
  private async loadDeviceInfo() {
    try {
      this.deviceId = await AsyncStorage.getItem('push_device_id');
      this.deviceToken = await AsyncStorage.getItem('push_device_token');
    } catch (error) {
      console.error('Failed to load device info:', error);
    }
  }
  
  /**
   * Handle new token registration
   */
  private onRegister(token: { os: string; token: string }) {
    console.log('Push notification token received:', token);
    this.deviceToken = token.token;
    
    // Save token to storage
    AsyncStorage.setItem('push_device_token', token.token);
    
    // If we already have a device ID, update the token on the server
    if (this.deviceId) {
      this.updateDeviceToken();
    } else {
      this.registerDevice();
    }
  }
  
  /**
   * Handle received notification
   */
  private onNotification(notification: any) {
    console.log('Notification received:', notification);
    
    // If there is a user-defined handler, call it
    if (this.onNotificationListener) {
      this.onNotificationListener(notification);
    }
    
    // Required on iOS only
    notification.finish?.();
  }
  
  /**
   * Register device with the server
   */
  async registerDevice() {
    try {
      if (!this.deviceToken) {
        console.warn('No device token available for registration');
        return;
      }
      
      const deviceData = {
        deviceType: Platform.OS,
        deviceToken: this.deviceToken,
        deviceName: Platform.OS === 'ios' ? 'iOS Device' : 'Android Device',
        pushEnabled: true
      };
      
      const response = await api.user.registerDevice(deviceData);
      
      if (response.data && response.data.deviceId) {
        this.deviceId = response.data.deviceId;
        await AsyncStorage.setItem('push_device_id', response.data.deviceId);
        console.log('Device registered successfully with ID:', this.deviceId);
      }
    } catch (error) {
      console.error('Failed to register device:', error);
    }
  }
  
  /**
   * Update device token on the server
   */
  async updateDeviceToken() {
    try {
      if (!this.deviceId || !this.deviceToken) {
        console.warn('Device ID or token missing, cannot update');
        return;
      }
      
      await api.user.updateDeviceToken(this.deviceId, this.deviceToken);
      console.log('Device token updated successfully');
    } catch (error) {
      console.error('Failed to update device token:', error);
    }
  }
  
  /**
   * Toggle push notifications for this device
   */
  async togglePushNotifications(enabled: boolean) {
    try {
      if (!this.deviceId) {
        console.warn('No device ID available, cannot toggle notifications');
        return false;
      }
      
      // API call would go here to enable/disable notifications on the server
      await api.request({
        url: `${api.endpoints.devices}/${this.deviceId}/notifications`,
        method: 'PUT',
        data: { enabled }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to toggle push notifications:', error);
      return false;
    }
  }
  
  /**
   * Local notification handler
   */
  private onNotificationListener: ((notification: any) => void) | null = null;
  
  /**
   * Set notification handler
   */
  setOnNotificationListener(listener: (notification: any) => void) {
    this.onNotificationListener = listener;
  }
  
  /**
   * Send a local test notification
   */
  sendLocalNotification(title: string, message: string) {
    PushNotification.localNotification({
      channelId: 'default-channel',
      title,
      message,
      playSound: true,
      soundName: 'default',
    });
  }
}

// Export a singleton instance
export default new PushNotificationService();