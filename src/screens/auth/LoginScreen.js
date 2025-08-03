import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import biometricService from '../../utils/biometrics/BiometricService';
import errorHandler from '../../utils/ErrorHandler';
import { STORAGE_KEYS } from '../../api/config';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const { t } = useLocalization();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  
  // Initialize biometric service and check if saved credentials exist
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize biometric service
        await biometricService.initialize({
          localizationProvider: { t }
        });
        
        // Check if biometrics are available and enabled
        const available = biometricService.isAvailable;
        const enabled = await biometricService.isBiometricEnabled();
        const useBiometricsAtLogin = await AsyncStorage.getItem(STORAGE_KEYS.USE_BIOMETRICS_AT_LOGIN) === 'true';
        
        setBiometricsAvailable(available && enabled && useBiometricsAtLogin);
        
        if (available) {
          setBiometricType(biometricService.getBiometricTypeName());
        }
        
        // Check if we have stored credentials
        const savedUsername = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_USERNAME);
        const savedRememberMe = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
        
        if (savedUsername && savedRememberMe) {
          setUsername(savedUsername);
          setRememberMe(true);
          
          // If biometrics are available and enabled, prompt for biometric auth
          if (available && enabled && useBiometricsAtLogin) {
            setTimeout(() => {
              promptBiometricAuth();
            }, 500);
          }
        }
      } catch (error) {
        console.error('Error initializing:', error);
      }
    };
    
    initialize();
  }, []);
  
  // Handle biometric authentication
  const promptBiometricAuth = () => {
    navigation.navigate('BiometricAuth', {
      reason: 'login',
      onAuthenticated: async () => {
        try {
          setLoading(true);
          
          // Get stored password (this should be a secure hash or token, not the actual password)
          const savedUsername = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_USERNAME);
          const authToken = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_AUTH_TOKEN);
          
          if (savedUsername && authToken) {
            // Authenticate with saved token
            const response = await login(savedUsername, null, null, authToken);
            
            if (response.success) {
              // Navigate based on response
              if (response.requires2FA) {
                navigation.navigate('TwoFactor', {
                  userId: response.userId,
                  email: response.email,
                  token: response.tempToken
                });
              }
              // No need to handle success case as the Auth context will update and redirect
            } else {
              Alert.alert(t('error'), response.message || t('biometric_auth_failed'));
            }
          } else {
            Alert.alert(t('error'), t('biometric_auth_not_setup'));
          }
        } catch (error) {
          errorHandler.handleApiError(error);
        } finally {
          setLoading(false);
        }
      },
      onCancel: () => {
        // User canceled biometric auth, just return to login screen
        console.log('Biometric auth canceled');
      }
    });
  };
  
  // Handle login button press
  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert(t('error'), t('please_enter_credentials'));
      return;
    }
    
    try {
      setLoading(true);
      
      // Call login from auth context
      const response = await login(username, password);
      
      if (response.success) {
        // If remember me is checked, save username
        if (rememberMe) {
          await AsyncStorage.setItem(STORAGE_KEYS.SAVED_USERNAME, username);
          await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
          
          // If biometrics are available and enabled, save biometric auth token
          const biometricsEnabled = await biometricService.isBiometricEnabled();
          if (biometricsEnabled && response.token) {
            await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRIC_AUTH_TOKEN, response.token);
          }
        } else {
          // Clear saved credentials
          await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_USERNAME);
          await AsyncStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
          await AsyncStorage.removeItem(STORAGE_KEYS.BIOMETRIC_AUTH_TOKEN);
        }
        
        // Check if 2FA is required
        if (response.requires2FA) {
          navigation.navigate('TwoFactor', {
            userId: response.userId,
            email: response.email,
            token: response.tempToken
          });
        }
        // No need to handle success case as the Auth context will update and redirect
      } else {
        Alert.alert(t('error'), response.message || t('login_failed'));
      }
    } catch (error) {
      errorHandler.handleApiError(error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/app-icon/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>EvokeEssence Crypto</Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>{t('login_title')}</Text>
          <Text style={styles.subtitleText}>{t('login_subtitle')}</Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#757575" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('username')}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#757575" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureTextEntry}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.visibilityButton}
              onPress={() => setSecureTextEntry(!secureTextEntry)}
            >
              <Ionicons
                name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#757575"
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={styles.rememberMeText}>{t('remember_me')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotPasswordText}>{t('forgot_password')}</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>{t('login')}</Text>
            )}
          </TouchableOpacity>
          
          {biometricsAvailable && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={promptBiometricAuth}
              disabled={loading}
            >
              <Ionicons 
                name={biometricType === 'Face ID' || biometricType.includes('Face') ? 'scan' : 'finger-print'} 
                size={22} 
                color="#6200ee" 
              />
              <Text style={styles.biometricButtonText}>
                {biometricType === 'Face ID' || biometricType.includes('Face') 
                  ? t('login_with_face_id') 
                  : t('login_with_fingerprint')}
              </Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>{t('dont_have_account')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>{t('register')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 60,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  visibilityButton: {
    padding: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#6200ee',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#616161',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#6200ee',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  biometricButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6200ee',
    borderRadius: 8,
    height: 50,
    marginBottom: 24,
    backgroundColor: 'rgba(98, 0, 238, 0.05)',
  },
  biometricButtonText: {
    color: '#6200ee',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#616161',
  },
  registerLink: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: '500',
    marginLeft: 4,
  },
});

export default LoginScreen;