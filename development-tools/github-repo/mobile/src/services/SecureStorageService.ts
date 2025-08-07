import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';

/**
 * Service for secure storage of sensitive information
 * Uses Keychain for sensitive data on iOS/Android and falls back to AsyncStorage for non-sensitive data
 */
class SecureStorageService {
  // Keychain service name for grouping credentials
  private SERVICE_NAME = 'com.evokeessence.exchange';
  
  /**
   * Store sensitive data securely (tokens, passwords, etc.)
   * @param key The key to store the data under
   * @param value The value to store
   */
  async setSecureItem(key: string, value: string): Promise<boolean> {
    try {
      // Store in device keychain
      const result = await Keychain.setGenericPassword(
        key,
        value,
        {
          service: `${this.SERVICE_NAME}.${key}`,
          // On Android, this option will determine if the stored value is encrypted
          accessible: Platform.OS === 'ios'
            ? Keychain.ACCESSIBLE.WHEN_UNLOCKED
            : Keychain.ACCESSIBLE.ALWAYS
        }
      );
      
      return !!result;
    } catch (error) {
      console.error(`Error storing secure item ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Retrieve sensitive data from secure storage
   * @param key The key to retrieve
   */
  async getSecureItem(key: string): Promise<string | null> {
    try {
      // Retrieve from device keychain
      const result = await Keychain.getGenericPassword({
        service: `${this.SERVICE_NAME}.${key}`
      });
      
      if (result) {
        return result.password;
      }
      
      return null;
    } catch (error) {
      console.error(`Error retrieving secure item ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Delete sensitive data from secure storage
   * @param key The key to delete
   */
  async removeSecureItem(key: string): Promise<boolean> {
    try {
      // Remove from device keychain
      const result = await Keychain.resetGenericPassword({
        service: `${this.SERVICE_NAME}.${key}`
      });
      
      return result;
    } catch (error) {
      console.error(`Error removing secure item ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Store authentication token securely
   * @param token The authentication token
   */
  async setAuthToken(token: string): Promise<boolean> {
    return this.setSecureItem('auth_token', token);
  }
  
  /**
   * Get authentication token
   */
  async getAuthToken(): Promise<string | null> {
    return this.getSecureItem('auth_token');
  }
  
  /**
   * Remove authentication token
   */
  async removeAuthToken(): Promise<boolean> {
    return this.removeSecureItem('auth_token');
  }
  
  /**
   * Store non-sensitive data
   * Uses AsyncStorage which is not encrypted
   * @param key The key to store the data under
   * @param value The value to store
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error storing item ${key}:`, error);
    }
  }
  
  /**
   * Retrieve non-sensitive data
   * @param key The key to retrieve
   */
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Error retrieving item ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Delete non-sensitive data
   * @param key The key to delete
   */
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
    }
  }
  
  /**
   * Store user preferences
   * @param preferences User preferences object
   */
  async setUserPreferences(preferences: Record<string, any>): Promise<void> {
    await this.setItem('user_preferences', JSON.stringify(preferences));
  }
  
  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<Record<string, any> | null> {
    const preferencesJson = await this.getItem('user_preferences');
    if (preferencesJson) {
      try {
        return JSON.parse(preferencesJson);
      } catch (error) {
        console.error('Error parsing user preferences:', error);
      }
    }
    return null;
  }
}

// Export a singleton instance
export default new SecureStorageService();