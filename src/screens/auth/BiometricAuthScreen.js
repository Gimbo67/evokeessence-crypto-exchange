import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalization } from '../../context/LocalizationContext';
import biometricService from '../../utils/biometrics/BiometricService';
import { STORAGE_KEYS } from '../../api/config';

const BiometricAuthScreen = ({ navigation, route }) => {
  const { t } = useLocalization();
  const [loading, setLoading] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  // Get route params
  const { 
    onAuthenticated, 
    onCancel, 
    reason = 'login',
    fallbackRoute = 'Login'
  } = route.params || {};

  // Initialize biometric service
  useEffect(() => {
    const initBiometrics = async () => {
      try {
        // Initialize biometric service with localization
        await biometricService.initialize({
          localizationProvider: { t }
        });

        // Check if biometrics are available and enabled
        const available = biometricService.isAvailable;
        setIsBiometricAvailable(available);

        if (available) {
          setBiometricType(biometricService.getBiometricTypeName());
          
          // Start authentication immediately
          setTimeout(() => {
            handleBiometricAuth();
          }, 500);
        } else {
          // If biometrics are not available, show error and navigate back
          setTimeout(() => {
            Alert.alert(
              t('biometrics_not_available_title'),
              t('biometrics_not_available_message'),
              [
                { 
                  text: t('ok'), 
                  onPress: () => handleCancel()
                }
              ]
            );
          }, 500);
        }
      } catch (error) {
        console.error('Error initializing biometrics:', error);
        setIsBiometricAvailable(false);
        
        // Show error and navigate back
        Alert.alert(
          t('error'),
          t('biometrics_error'),
          [
            { 
              text: t('ok'), 
              onPress: () => handleCancel()
            }
          ]
        );
      }
    };

    initBiometrics();
  }, []);

  // Handle biometric authentication
  const handleBiometricAuth = async () => {
    if (loading || !isBiometricAvailable) return;

    try {
      setLoading(true);
      
      const result = await biometricService.authenticate(reason);
      
      if (result.success) {
        if (onAuthenticated) {
          onAuthenticated();
        } else {
          // Default behavior - navigate back with success result
          navigation.goBack();
        }
      } else {
        // Handle authentication error
        if (result.error === 'user_cancel' || result.error === 'system_cancel') {
          handleCancel();
        } else {
          biometricService.handleAuthenticationError(result.error, () => {
            handleCancel();
          });
        }
      }
    } catch (error) {
      console.error('Error during biometric authentication:', error);
      Alert.alert(
        t('error'),
        t('biometrics_error'),
        [
          { 
            text: t('ok'), 
            onPress: () => handleCancel()
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel button press
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      // Default behavior - navigate to fallback route
      navigation.navigate(fallbackRoute);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {biometricType === 'Face ID' || biometricType.includes('Face') ? (
            <Ionicons name="scan-outline" size={80} color="#6200ee" />
          ) : (
            <Ionicons name="finger-print" size={80} color="#6200ee" />
          )}
        </View>
        
        <Text style={styles.title}>
          {reason === 'login'
            ? biometricType === 'Face ID' || biometricType.includes('Face')
              ? t('face_id_login')
              : t('fingerprint_login')
            : reason === 'transaction'
            ? biometricType === 'Face ID' || biometricType.includes('Face')
              ? t('face_id_transaction')
              : t('fingerprint_transaction')
            : biometricType === 'Face ID' || biometricType.includes('Face')
            ? t('face_id_authenticate')
            : t('fingerprint_authenticate')
          }
        </Text>
        
        <Text style={styles.description}>
          {reason === 'login'
            ? t('biometrics_login_description')
            : reason === 'transaction'
            ? t('biometrics_transaction_description')
            : t('biometrics_authenticate_description')
          }
        </Text>
        
        {loading && (
          <ActivityIndicator
            style={styles.loadingIndicator}
            size="large"
            color="#6200ee"
          />
        )}
        
        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleBiometricAuth}
          disabled={loading || !isBiometricAvailable}
        >
          <Text style={styles.retryButtonText}>{t('try_again')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    alignItems: 'flex-end',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    color: '#6200ee',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 32,
  },
  loadingIndicator: {
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BiometricAuthScreen;