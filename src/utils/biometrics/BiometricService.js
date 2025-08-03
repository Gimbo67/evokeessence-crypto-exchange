import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';
import { STORAGE_KEYS } from '../../api/config';

/**
 * BiometricService - Handles all biometric authentication functionality
 * This service provides methods for checking availability, enrolling biometrics,
 * authenticating with biometrics, and handling error cases.
 */
class BiometricService {
  constructor() {
    this.isAvailable = false;
    this.biometryType = null;
    this.localizationProvider = null;
  }

  /**
   * Initialize the biometric service
   * @param {Object} options - Configuration options
   * @param {Object} options.localizationProvider - Provides localization functions
   */
  async initialize(options = {}) {
    try {
      this.localizationProvider = options.localizationProvider;

      // Check if biometrics are available on this device
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        this.isAvailable = false;
        return false;
      }

      // Check if biometrics are enrolled
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        this.isAvailable = false;
        return false;
      }

      // Get available biometric types
      const biometryTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (biometryTypes.length > 0) {
        this.biometryType = biometryTypes[0];
        this.isAvailable = true;
        return true;
      }

      this.isAvailable = false;
      return false;
    } catch (error) {
      console.error('BiometricService initialization error:', error);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Check if biometrics are enabled in app settings
   */
  async isBiometricEnabled() {
    try {
      const enabled = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRICS_ENABLED);
      return enabled === 'true';
    } catch (error) {
      console.error('Error checking if biometrics are enabled:', error);
      return false;
    }
  }

  /**
   * Enable biometric authentication
   * This requires a successful authentication before enabling
   */
  async enableBiometrics() {
    try {
      // Verify biometrics first
      const result = await this.authenticate('verify_identity');
      
      if (result.success) {
        // Save the setting
        await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRICS_ENABLED, 'true');
        return { success: true };
      }
      
      return result;
    } catch (error) {
      console.error('Error enabling biometrics:', error);
      return { 
        success: false, 
        error: 'unknown_error',
        errorMessage: error.message 
      };
    }
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometrics() {
    try {
      // Remove biometric settings
      await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRICS_ENABLED, 'false');
      
      // Clear stored biometric auth token
      await AsyncStorage.removeItem(STORAGE_KEYS.BIOMETRIC_AUTH_TOKEN);
      
      // Clear use biometrics at login setting
      await AsyncStorage.removeItem(STORAGE_KEYS.USE_BIOMETRICS_AT_LOGIN);
      
      return { success: true };
    } catch (error) {
      console.error('Error disabling biometrics:', error);
      return { 
        success: false, 
        error: 'unknown_error',
        errorMessage: error.message 
      };
    }
  }

  /**
   * Get human-readable biometric type name
   */
  getBiometricTypeName() {
    // If biometryType is not set, biometrics are not available
    if (!this.biometryType) {
      return 'None';
    }

    // Map biometry type to human-readable name
    if (this.biometryType === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Authentication';
    } else if (this.biometryType === LocalAuthentication.AuthenticationType.FINGERPRINT) {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    } else if (this.biometryType === LocalAuthentication.AuthenticationType.IRIS) {
      return 'Iris Scan';
    }

    return 'Biometrics';
  }

  /**
   * Authenticate with biometrics
   * @param {string} reason - Reason for authentication (login, transaction, verify_identity)
   * @returns {Promise<Object>} - Result of authentication
   */
  async authenticate(reason = 'login') {
    if (!this.isAvailable) {
      return { 
        success: false, 
        error: 'not_available',
        errorMessage: this.t('biometrics_not_available')
      };
    }

    try {
      const promptMessage = this.getPromptMessageForReason(reason);
      
      // Authenticate with biometrics
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: this.t('enter_passcode'),
        cancelLabel: this.t('cancel'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        return { success: true };
      } else {
        let error = 'authentication_failed';
        
        if (result.error === 'lockout') {
          error = 'lockout';
        } else if (result.error === 'user_cancel' || result.error === 'system_cancel' || result.error === 'app_cancel') {
          error = 'user_cancel';
        }
        
        return { 
          success: false, 
          error,
          errorMessage: this.getErrorMessageForCode(error)
        };
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return { 
        success: false, 
        error: 'unknown_error',
        errorMessage: error.message 
      };
    }
  }

  /**
   * Handle authentication errors
   * @param {string} errorCode - Error code
   * @param {Function} callback - Optional callback after error is handled
   */
  handleAuthenticationError(errorCode, callback) {
    const errorMessage = this.getErrorMessageForCode(errorCode);
    
    if (errorCode === 'lockout') {
      Alert.alert(
        this.t('biometrics_lockout_title'),
        this.t('biometrics_lockout_message'),
        [
          { 
            text: this.t('ok'), 
            onPress: () => {
              if (callback) callback();
            }
          }
        ]
      );
    } else if (errorCode === 'not_available') {
      Alert.alert(
        this.t('biometrics_not_available_title'),
        this.t('biometrics_not_available_message'),
        [
          { 
            text: this.t('ok'), 
            onPress: () => {
              if (callback) callback();
            }
          }
        ]
      );
    } else if (errorCode !== 'user_cancel' && errorCode !== 'system_cancel') {
      // Don't show alerts for user cancel
      Alert.alert(
        this.t('authentication_failed'),
        errorMessage,
        [
          { 
            text: this.t('ok'), 
            onPress: () => {
              if (callback) callback();
            }
          }
        ]
      );
    } else if (callback) {
      callback();
    }
  }

  /**
   * Get prompt message based on authentication reason
   * @param {string} reason - Reason for authentication
   * @returns {string} - Prompt message
   */
  getPromptMessageForReason(reason) {
    switch (reason) {
      case 'login':
        return this.t('biometrics_prompt_login');
      case 'transaction':
        return this.t('biometrics_prompt_transaction');
      case 'verify_identity':
        return this.t('biometrics_prompt_verify');
      default:
        return this.t('biometrics_prompt_authenticate');
    }
  }

  /**
   * Get error message for error code
   * @param {string} errorCode - Error code
   * @returns {string} - Error message
   */
  getErrorMessageForCode(errorCode) {
    switch (errorCode) {
      case 'not_available':
        return this.t('biometrics_not_available_message');
      case 'lockout':
        return this.t('biometrics_lockout_message');
      case 'user_cancel':
      case 'system_cancel':
        return this.t('biometrics_cancelled');
      default:
        return this.t('biometrics_error');
    }
  }

  /**
   * Get localized text
   * @param {string} key - Localization key
   * @returns {string} - Localized text
   */
  t(key) {
    if (this.localizationProvider && this.localizationProvider.t) {
      return this.localizationProvider.t(key);
    }
    
    // Fallback messages if localization provider not available
    const fallbackMessages = {
      biometrics_not_available: 'Biometric authentication is not available on this device.',
      biometrics_not_available_message: 'Your device doesn\'t support biometric authentication or no biometrics are enrolled.',
      biometrics_not_available_title: 'Biometrics Not Available',
      biometrics_lockout_message: 'Too many failed attempts. Please use your device passcode to unlock.',
      biometrics_lockout_title: 'Biometrics Locked Out',
      biometrics_cancelled: 'Authentication was cancelled.',
      biometrics_error: 'An error occurred during biometric authentication.',
      authentication_failed: 'Authentication Failed',
      biometrics_prompt_login: 'Authenticate to log in',
      biometrics_prompt_transaction: 'Authenticate to confirm transaction',
      biometrics_prompt_verify: 'Verify your identity',
      biometrics_prompt_authenticate: 'Authenticate to continue',
      enter_passcode: 'Enter passcode',
      cancel: 'Cancel',
      ok: 'OK'
    };
    
    return fallbackMessages[key] || key;
  }
}

// Create singleton instance
const biometricService = new BiometricService();

export default biometricService;