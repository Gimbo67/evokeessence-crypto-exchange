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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../../context/AuthContext';

// Create a reusable section component
const SettingsSection = ({ title, description, children }: any) => (
  <View style={styles.settingsSection}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {description && <Text style={styles.sectionDescription}>{description}</Text>}
    {children}
  </View>
);

const BiometricSettingsScreen = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [biometricTypes, setBiometricTypes] = useState<string[]>([]);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [requireBiometricOnStartup, setRequireBiometricOnStartup] = useState(false);
  const [requireBiometricForTransactions, setRequireBiometricForTransactions] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
    loadSettings();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        setBiometricAvailable(false);
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        setBiometricAvailable(false);
        return;
      }

      setBiometricAvailable(true);
      
      // Get available biometric types
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const biometricNames = supportedTypes.map((type) => {
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
      setBiometricTypes(biometricNames);

    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  const loadSettings = async () => {
    try {
      const biometricEnabledValue = await SecureStore.getItemAsync('biometricEnabled');
      const biometricStartupValue = await SecureStore.getItemAsync('biometricOnStartup');
      const biometricTransactionsValue = await SecureStore.getItemAsync('biometricForTransactions');

      setBiometricEnabled(biometricEnabledValue === 'true');
      setRequireBiometricOnStartup(biometricStartupValue === 'true');
      setRequireBiometricForTransactions(biometricTransactionsValue === 'true');
    } catch (error) {
      console.error('Error loading biometric settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSetting = async (key: string, value: boolean) => {
    try {
      await SecureStore.setItemAsync(key, value.toString());
      return true;
    } catch (error) {
      console.error(`Error saving setting ${key}:`, error);
      return false;
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    if (value && !biometricAvailable) {
      Alert.alert(
        'Biometric Authentication Not Available',
        'Your device does not support biometric authentication or you have not set it up in your device settings.'
      );
      return;
    }

    setIsLoading(true);
    try {
      if (value) {
        // Authenticate before enabling
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to enable biometric login',
          fallbackLabel: 'Use Password',
        });

        if (result.success) {
          const success = await saveSetting('biometricEnabled', true);
          if (success) {
            setBiometricEnabled(true);
            Alert.alert(
              'Biometric Authentication Enabled',
              'You can now use your biometric data to authenticate in the app.'
            );
          } else {
            throw new Error('Failed to save settings');
          }
        } else {
          // User canceled or authentication failed
          return;
        }
      } else {
        // Disable biometric
        const success = await saveSetting('biometricEnabled', false);
        if (success) {
          setBiometricEnabled(false);
          
          // Also disable dependent options
          await saveSetting('biometricOnStartup', false);
          await saveSetting('biometricForTransactions', false);
          
          setRequireBiometricOnStartup(false);
          setRequireBiometricForTransactions(false);
          
          Alert.alert(
            'Biometric Authentication Disabled',
            'You will now use password authentication only.'
          );
        } else {
          throw new Error('Failed to save settings');
        }
      }
    } catch (error) {
      console.error('Error toggling biometric settings:', error);
      Alert.alert(
        'Error',
        'There was a problem updating your biometric settings. Please try again later.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBiometricOnStartup = async (value: boolean) => {
    setIsLoading(true);
    try {
      const success = await saveSetting('biometricOnStartup', value);
      if (success) {
        setRequireBiometricOnStartup(value);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error updating biometric on startup setting:', error);
      Alert.alert(
        'Error',
        'There was a problem updating your settings. Please try again later.'
      );
      // Reset to previous value
      setRequireBiometricOnStartup(!value);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBiometricForTransactions = async (value: boolean) => {
    setIsLoading(true);
    try {
      const success = await saveSetting('biometricForTransactions', value);
      if (success) {
        setRequireBiometricForTransactions(value);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error updating biometric for transactions setting:', error);
      Alert.alert(
        'Error',
        'There was a problem updating your settings. Please try again later.'
      );
      // Reset to previous value
      setRequireBiometricForTransactions(!value);
    } finally {
      setIsLoading(false);
    }
  };

  const testBiometricAuthentication = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to test biometric login',
        fallbackLabel: 'Use Password',
      });

      if (result.success) {
        Alert.alert(
          'Authentication Successful',
          'Your biometric authentication is working correctly!'
        );
      } else {
        Alert.alert(
          'Authentication Failed',
          result.error 
            ? `Error: ${result.error}` 
            : 'Authentication was canceled or failed.'
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        `There was a problem testing biometric authentication: ${error.message}`
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading biometric settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Biometric Authentication</Text>
      </View>

      <View style={styles.infoCard}>
        <Ionicons 
          name={Platform.OS === 'ios' ? 'ios-finger-print' : 'md-finger-print'} 
          size={60} 
          color="#0066CC" 
          style={styles.infoIcon} 
        />
        <Text style={styles.infoTitle}>Enhanced Security</Text>
        <Text style={styles.infoDescription}>
          Biometric authentication adds an extra layer of security to your account by using your unique biological traits.
        </Text>
      </View>

      <SettingsSection
        title="Biometric Status"
        description={
          biometricAvailable
            ? `Your device supports ${biometricTypes.join(' and ')} authentication.`
            : 'Your device does not support biometric authentication or you have not set it up in your device settings.'
        }
      >
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons 
              name={Platform.OS === 'ios' ? 'ios-finger-print' : 'md-finger-print'}
              size={24} 
              color="#333" 
              style={styles.settingIcon} 
            />
            <View>
              <Text style={styles.settingTitle}>Enable Biometric Authentication</Text>
              <Text style={styles.settingDescription}>
                Use your fingerprint, face, or iris to authenticate
              </Text>
            </View>
          </View>
          <Switch
            trackColor={{ false: '#d1d1d1', true: '#BDE4FF' }}
            thumbColor={biometricEnabled ? '#0066CC' : '#f4f3f4'}
            ios_backgroundColor="#d1d1d1"
            onValueChange={handleToggleBiometric}
            value={biometricEnabled}
            disabled={!biometricAvailable || isLoading}
          />
        </View>
      </SettingsSection>

      {biometricEnabled && (
        <>
          <SettingsSection
            title="Authentication Settings"
            description="Configure when biometric authentication is required."
          >
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="log-in" size={24} color="#333" style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Require on App Startup</Text>
                  <Text style={styles.settingDescription}>
                    Use biometric authentication every time you open the app
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: '#d1d1d1', true: '#BDE4FF' }}
                thumbColor={requireBiometricOnStartup ? '#0066CC' : '#f4f3f4'}
                ios_backgroundColor="#d1d1d1"
                onValueChange={handleToggleBiometricOnStartup}
                value={requireBiometricOnStartup}
                disabled={!biometricEnabled || isLoading}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="card" size={24} color="#333" style={styles.settingIcon} />
                <View>
                  <Text style={styles.settingTitle}>Require for Transactions</Text>
                  <Text style={styles.settingDescription}>
                    Use biometric authentication for withdrawals and payments
                  </Text>
                </View>
              </View>
              <Switch
                trackColor={{ false: '#d1d1d1', true: '#BDE4FF' }}
                thumbColor={requireBiometricForTransactions ? '#0066CC' : '#f4f3f4'}
                ios_backgroundColor="#d1d1d1"
                onValueChange={handleToggleBiometricForTransactions}
                value={requireBiometricForTransactions}
                disabled={!biometricEnabled || isLoading}
              />
            </View>
          </SettingsSection>

          <TouchableOpacity 
            style={styles.testButton}
            onPress={testBiometricAuthentication}
            disabled={!biometricEnabled}
          >
            <Text style={styles.testButtonText}>Test Biometric Authentication</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.securityNote}>
        <Ionicons name="information-circle-outline" size={24} color="#0066CC" />
        <Text style={styles.securityNoteText}>
          Biometric authentication uses your device's built-in security features. 
          Your biometric data is stored securely on your device and is never 
          transmitted to EvokeEssence servers.
        </Text>
      </View>
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
  settingsSection: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
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
  testButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  securityNote: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 30,
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
});

export default BiometricSettingsScreen;