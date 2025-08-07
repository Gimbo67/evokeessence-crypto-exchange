import axios from 'axios';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config/constants';

// Service for handling 2FA-related functionality
const twoFactorAuthService = {
  /**
   * Check if the user has 2FA enabled
   */
  async isTwoFactorEnabled(): Promise<boolean> {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return false;

      const response = await axios.get(`${API_URL}/auth/2fa/status`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data.twoFactorEnabled;
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      return false;
    }
  },

  /**
   * Setup 2FA for the user
   * Returns QR code data and secret for authenticator apps
   */
  async setupTwoFactor(): Promise<{
    qrCodeUrl: string;
    secret: string;
    success: boolean;
  }> {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.post(
        `${API_URL}/auth/2fa/setup`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      return {
        qrCodeUrl: response.data.qrCodeUrl,
        secret: response.data.secret,
        success: true
      };
    } catch (error) {
      console.error('Error setting up 2FA:', error);
      Alert.alert('Error', 'Failed to setup two-factor authentication');
      return {
        qrCodeUrl: '',
        secret: '',
        success: false
      };
    }
  },

  /**
   * Verify 2FA token during setup
   */
  async verifySetup(token: string): Promise<boolean> {
    try {
      const userToken = await SecureStore.getItemAsync('userToken');
      if (!userToken) {
        throw new Error('Authentication required');
      }

      const response = await axios.post(
        `${API_URL}/auth/2fa/verify-setup`,
        { token },
        {
          headers: {
            Authorization: `Bearer ${userToken}`
          }
        }
      );

      return response.data.success || false;
    } catch (error) {
      console.error('Error verifying 2FA setup:', error);
      Alert.alert('Error', 'Failed to verify two-factor authentication code');
      return false;
    }
  },

  /**
   * Disable 2FA for user
   */
  async disableTwoFactor(token: string): Promise<boolean> {
    try {
      const userToken = await SecureStore.getItemAsync('userToken');
      if (!userToken) {
        throw new Error('Authentication required');
      }

      const response = await axios.post(
        `${API_URL}/auth/2fa/disable`,
        { token },
        {
          headers: {
            Authorization: `Bearer ${userToken}`
          }
        }
      );

      return response.data.success || false;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      Alert.alert('Error', 'Failed to disable two-factor authentication');
      return false;
    }
  },

  /**
   * Verify 2FA token during login
   */
  async verifyLogin(
    userId: string | number,
    token: string
  ): Promise<{ success: boolean; userToken?: string }> {
    try {
      const response = await axios.post(`${API_URL}/auth/2fa/verify-login`, {
        userId,
        token
      });

      if (response.data.success && response.data.token) {
        // Store the JWT token
        await SecureStore.setItemAsync('userToken', response.data.token);
        return {
          success: true,
          userToken: response.data.token
        };
      }

      return { success: false };
    } catch (error) {
      console.error('Error verifying 2FA login:', error);
      Alert.alert('Error', 'Failed to verify authentication code');
      return { success: false };
    }
  },

  /**
   * Get backup codes for the user
   */
  async getBackupCodes(): Promise<string[]> {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.get(`${API_URL}/auth/2fa/backup-codes`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data.backupCodes || [];
    } catch (error) {
      console.error('Error getting backup codes:', error);
      Alert.alert('Error', 'Failed to retrieve backup codes');
      return [];
    }
  },

  /**
   * Generate new backup codes
   */
  async generateNewBackupCodes(): Promise<string[]> {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.post(
        `${API_URL}/auth/2fa/generate-backup-codes`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      return response.data.backupCodes || [];
    } catch (error) {
      console.error('Error generating new backup codes:', error);
      Alert.alert('Error', 'Failed to generate new backup codes');
      return [];
    }
  }
};

export default twoFactorAuthService;