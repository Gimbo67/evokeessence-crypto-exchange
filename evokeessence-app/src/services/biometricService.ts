import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

class BiometricService {
  // Check if biometric authentication is available on the device
  async isBiometricAvailable(): Promise<boolean> {
    try {
      // Check if hardware supports biometrics
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) return false;
      
      // Check if the user has enrolled in biometrics on their device
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  // Get supported biometric types (fingerprint, facial recognition, etc.)
  async getSupportedBiometricTypes(): Promise<string[]> {
    try {
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return supportedTypes.map((type) => {
        switch (type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'Fingerprint';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'Face ID';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'Iris';
          default:
            return 'Biometric';
        }
      });
    } catch (error) {
      console.error('Error getting supported biometric types:', error);
      return [];
    }
  }

  // Authenticate user with biometrics
  async authenticate(promptMessage: string): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Authenticate to continue',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
      });
      
      return result.success;
    } catch (error) {
      console.error('Error during biometric authentication:', error);
      return false;
    }
  }

  // Load biometric settings from secure storage
  async loadBiometricSettings(): Promise<{
    biometricEnabled: boolean;
    biometricOnStartup: boolean;
    biometricForTransactions: boolean;
  }> {
    try {
      const biometricEnabled = await SecureStore.getItemAsync('biometricEnabled');
      const biometricOnStartup = await SecureStore.getItemAsync('biometricOnStartup');
      const biometricForTransactions = await SecureStore.getItemAsync('biometricForTransactions');
      
      return {
        biometricEnabled: biometricEnabled === 'true',
        biometricOnStartup: biometricOnStartup === 'true',
        biometricForTransactions: biometricForTransactions === 'true',
      };
    } catch (error) {
      console.error('Error loading biometric settings:', error);
      return {
        biometricEnabled: false,
        biometricOnStartup: false,
        biometricForTransactions: false,
      };
    }
  }

  // Save a biometric setting to secure storage
  async saveBiometricSetting(key: string, value: boolean): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(key, value.toString());
      return true;
    } catch (error) {
      console.error(`Error saving biometric setting ${key}:`, error);
      return false;
    }
  }

  // Check if biometric authentication should be required on app startup
  async shouldAuthenticateOnStartup(): Promise<boolean> {
    try {
      const biometricEnabled = await SecureStore.getItemAsync('biometricEnabled');
      const biometricOnStartup = await SecureStore.getItemAsync('biometricOnStartup');
      
      return biometricEnabled === 'true' && biometricOnStartup === 'true';
    } catch (error) {
      console.error('Error checking if biometric auth is required on startup:', error);
      return false;
    }
  }

  // Check if biometric authentication should be required for transactions
  async shouldAuthenticateForTransactions(): Promise<boolean> {
    try {
      const biometricEnabled = await SecureStore.getItemAsync('biometricEnabled');
      const biometricForTransactions = await SecureStore.getItemAsync('biometricForTransactions');
      
      return biometricEnabled === 'true' && biometricForTransactions === 'true';
    } catch (error) {
      console.error('Error checking if biometric auth is required for transactions:', error);
      return false;
    }
  }

  // Enable biometric authentication after successful authentication
  async enableBiometricAuthentication(): Promise<boolean> {
    try {
      // Authenticate user first
      const authenticated = await this.authenticate('Authenticate to enable biometric login');
      
      if (authenticated) {
        // Save settings
        await this.saveBiometricSetting('biometricEnabled', true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error enabling biometric authentication:', error);
      return false;
    }
  }

  // Disable biometric authentication
  async disableBiometricAuthentication(): Promise<boolean> {
    try {
      // Disable all biometric settings
      await this.saveBiometricSetting('biometricEnabled', false);
      await this.saveBiometricSetting('biometricOnStartup', false);
      await this.saveBiometricSetting('biometricForTransactions', false);
      
      return true;
    } catch (error) {
      console.error('Error disabling biometric authentication:', error);
      return false;
    }
  }
}

export default new BiometricService();