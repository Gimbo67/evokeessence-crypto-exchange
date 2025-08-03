import * as SecureStore from 'expo-secure-store';
import { apiClient } from './authService';

// This service handles push notification registration and handling for the app
class PushNotificationService {
  // Register the device for push notifications
  async registerForPushNotifications(userId: string): Promise<boolean> {
    try {
      // In a real implementation with Expo, we would use:
      // const { status: existingStatus } = await Notifications.getPermissionsAsync();
      // let finalStatus = existingStatus;
      // if (existingStatus !== 'granted') {
      //   const { status } = await Notifications.requestPermissionsAsync();
      //   finalStatus = status;
      // }
      
      // if (finalStatus !== 'granted') {
      //   return false;
      // }
      
      // const token = (await Notifications.getExpoPushTokenAsync()).data;
      // Save device token to API for this user
      
      // For this implementation, we'll simulate getting a token
      const mockToken = `ExpoToken-${Date.now()}-${userId}`;
      
      // Save the token to the server
      const response = await apiClient.post('/user/push-token', {
        userId,
        token: mockToken,
        platform: 'ios',
        appVersion: '1.0.0'
      });
      
      // Store the token locally for future reference
      await SecureStore.setItemAsync('pushToken', mockToken);
      
      return response.data.success;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return false;
    }
  }

  // Unregister device from push notifications
  async unregisterPushNotifications(): Promise<boolean> {
    try {
      const token = await SecureStore.getItemAsync('pushToken');
      
      if (!token) {
        return true; // Nothing to unregister
      }
      
      // Send request to server to remove this token
      const response = await apiClient.delete('/user/push-token', {
        data: { token }
      });
      
      // Remove locally stored token
      await SecureStore.deleteItemAsync('pushToken');
      
      return response.data.success;
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
      return false;
    }
  }

  // Update user notification preferences
  async updateNotificationPreferences(preferences: {
    verificationUpdates?: boolean;
    marketAlerts?: boolean;
    depositConfirmations?: boolean;
    withdrawalConfirmations?: boolean;
    securityAlerts?: boolean;
  }): Promise<boolean> {
    try {
      const response = await apiClient.put('/user/notification-preferences', preferences);
      return response.data.success;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  // Get user notification preferences
  async getNotificationPreferences(): Promise<any> {
    try {
      const response = await apiClient.get('/user/notification-preferences');
      return response.data.preferences;
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {
        verificationUpdates: true,
        marketAlerts: true,
        depositConfirmations: true,
        withdrawalConfirmations: true,
        securityAlerts: true
      };
    }
  }

  // Handle incoming push notification for verification status update
  handleVerificationStatusUpdate(notification: any): void {
    const { status, message } = notification.data;
    
    // In a real app, we would show the notification to the user
    // and potentially navigate to the verification screen
    console.log(`Verification status updated to: ${status}`);
    console.log(`Message: ${message}`);
    
    // Depending on the status, we could take different actions
    switch (status) {
      case 'approved':
        // Navigate to verification screen showing approved status
        break;
      case 'rejected':
        // Navigate to verification screen showing rejected status
        break;
      case 'pending':
        // Navigate to verification screen showing pending status
        break;
      default:
        // Handle unknown status
        break;
    }
  }
}

export default new PushNotificationService();