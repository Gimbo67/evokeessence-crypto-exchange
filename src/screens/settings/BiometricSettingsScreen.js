import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'react-native-paper';
import { useLocalization } from '../../context/LocalizationContext';
import biometricService from '../../utils/biometrics/BiometricService';
import errorHandler from '../../utils/ErrorHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../api/config';

const BiometricSettingsScreen = ({ navigation }) => {
  const { t } = useLocalization();
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [biometricType, setBiometricType] = useState(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isTogglingBiometric, setIsTogglingBiometric] = useState(false);

  // Initialize biometric service and check availability
  useEffect(() => {
    const initBiometrics = async () => {
      try {
        // Initialize biometric service with localization
        await biometricService.initialize({
          localizationProvider: { t }
        });

        // Check if biometrics are available
        const available = biometricService.isAvailable;
        setIsBiometricAvailable(available);

        if (available) {
          // Get biometric type
          setBiometricType(biometricService.getBiometricTypeName());

          // Check if biometrics are enabled in app settings
          const enabled = await biometricService.isBiometricEnabled();
          setIsBiometricEnabled(enabled);
        }
      } catch (error) {
        console.error('Error initializing biometrics:', error);
        setIsBiometricAvailable(false);
      } finally {
        setInitializing(false);
        setLoading(false);
      }
    };

    initBiometrics();
  }, []);

  // Handle toggle biometric authentication
  const handleToggleBiometrics = async (value) => {
    if (isTogglingBiometric) return;

    try {
      setIsTogglingBiometric(true);

      if (value) {
        // Enable biometrics - requires authentication first
        const result = await biometricService.enableBiometrics();
        
        if (result.success) {
          setIsBiometricEnabled(true);
          Alert.alert(
            t('biometrics_enabled_title'), 
            t('biometrics_enabled_message')
          );
        } else {
          biometricService.handleAuthenticationError(result.error);
        }
      } else {
        // Disable biometrics
        const result = await biometricService.disableBiometrics();
        
        if (result.success) {
          setIsBiometricEnabled(false);
          Alert.alert(
            t('biometrics_disabled_title'), 
            t('biometrics_disabled_message')
          );
        }
      }
    } catch (error) {
      errorHandler.handleApiError(error);
    } finally {
      setIsTogglingBiometric(false);
    }
  };

  // Test biometric authentication
  const testBiometricAuth = async () => {
    try {
      setLoading(true);
      
      const result = await biometricService.authenticate('verify_identity');
      
      if (result.success) {
        Alert.alert(
          t('biometrics_test_success_title'),
          t('biometrics_test_success_message')
        );
      } else {
        biometricService.handleAuthenticationError(result.error);
      }
    } catch (error) {
      console.error('Error testing biometric authentication:', error);
      Alert.alert(
        t('error'),
        t('biometrics_test_error')
      );
    } finally {
      setLoading(false);
    }
  };

  // Set whether to use biometrics at login
  const setUseBiometricsAtLogin = async (value) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USE_BIOMETRICS_AT_LOGIN, value.toString());
    } catch (error) {
      console.error('Error setting use biometrics at login:', error);
    }
  };

  // Get whether to use biometrics at login
  const getUseBiometricsAtLogin = async () => {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.USE_BIOMETRICS_AT_LOGIN);
      return value === 'true';
    } catch (error) {
      console.error('Error getting use biometrics at login:', error);
      return false;
    }
  };

  // Handle toggle use biometrics at login
  const handleToggleUseBiometricsAtLogin = async (value) => {
    await setUseBiometricsAtLogin(value);
  };

  if (loading && initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('biometric_authentication')}</Text>
      </View>

      {!isBiometricAvailable ? (
        <Card style={styles.notAvailableCard}>
          <View style={styles.notAvailableCardContent}>
            <Ionicons name="warning" size={48} color="#ff9800" />
            <Text style={styles.notAvailableTitle}>{t('biometrics_not_available_title')}</Text>
            <Text style={styles.notAvailableText}>{t('biometrics_not_available_message')}</Text>
          </View>
        </Card>
      ) : (
        <>
          <Card style={styles.biometricCard}>
            <View style={styles.biometricCardContent}>
              <View style={styles.biometricHeader}>
                {biometricType === 'Face ID' || biometricType.includes('Face') ? (
                  <Ionicons name="scan-outline" size={40} color="#6200ee" />
                ) : (
                  <Ionicons name="finger-print" size={40} color="#6200ee" />
                )}
                <View style={styles.biometricInfo}>
                  <Text style={styles.biometricTitle}>{biometricType}</Text>
                  <Text style={styles.biometricSubtitle}>
                    {t('biometrics_subtitle')}
                  </Text>
                </View>
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>{t('enable_biometric_auth')}</Text>
                  <Text style={styles.settingDescription}>
                    {t('enable_biometric_auth_description')}
                  </Text>
                </View>
                {isTogglingBiometric ? (
                  <ActivityIndicator size="small" color="#6200ee" />
                ) : (
                  <Switch
                    value={isBiometricEnabled}
                    onValueChange={handleToggleBiometrics}
                    trackColor={{ false: '#e0e0e0', true: '#ba86fc' }}
                    thumbColor={isBiometricEnabled ? '#6200ee' : '#f5f5f5'}
                  />
                )}
              </View>

              {isBiometricEnabled && (
                <>
                  <View style={styles.divider} />

                  <View style={styles.settingItem}>
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingTitle}>{t('use_biometrics_at_login')}</Text>
                      <Text style={styles.settingDescription}>
                        {t('use_biometrics_at_login_description')}
                      </Text>
                    </View>
                    <Switch
                      value={getUseBiometricsAtLogin}
                      onValueChange={handleToggleUseBiometricsAtLogin}
                      trackColor={{ false: '#e0e0e0', true: '#ba86fc' }}
                      thumbColor={getUseBiometricsAtLogin ? '#6200ee' : '#f5f5f5'}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.testButton}
                    onPress={testBiometricAuth}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.testButtonText}>{t('test_biometric_auth')}</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Card>

          <Card style={styles.infoCard}>
            <View style={styles.infoCardContent}>
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle" size={24} color="#6200ee" />
                <Text style={styles.infoTitle}>{t('biometrics_info_title')}</Text>
              </View>
              
              <Text style={styles.infoText}>
                {t('biometrics_info_text')}
              </Text>
              
              <View style={styles.infoItem}>
                <Ionicons name="shield-checkmark" size={18} color="#4caf50" />
                <Text style={styles.infoItemText}>{t('biometrics_security_benefit')}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="time" size={18} color="#4caf50" />
                <Text style={styles.infoItemText}>{t('biometrics_convenience_benefit')}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="lock-closed" size={18} color="#4caf50" />
                <Text style={styles.infoItemText}>{t('biometrics_privacy_benefit')}</Text>
              </View>
            </View>
          </Card>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#6200ee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  notAvailableCard: {
    margin: 16,
    borderRadius: 8,
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  notAvailableCardContent: {
    padding: 16,
    alignItems: 'center',
  },
  notAvailableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  notAvailableText: {
    fontSize: 14,
    color: '#616161',
    textAlign: 'center',
    lineHeight: 20,
  },
  biometricCard: {
    margin: 16,
    borderRadius: 8,
  },
  biometricCardContent: {
    padding: 16,
  },
  biometricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  biometricInfo: {
    marginLeft: 16,
    flex: 1,
  },
  biometricTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  biometricSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  testButton: {
    backgroundColor: '#6200ee',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  testButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 8,
  },
  infoCardContent: {
    padding: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 16,
    lineHeight: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoItemText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#424242',
  },
});

export default BiometricSettingsScreen;