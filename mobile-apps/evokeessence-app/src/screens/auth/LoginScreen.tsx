import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import twoFactorAuthService from '../../services/twoFactorAuthService';
import biometricService from '../../services/biometricService';

interface LoginResponse {
  success: boolean;
  requiresTwoFactor?: boolean;
  userId?: string | number;
  message?: string;
}

const LoginScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { login } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  
  // Check if biometric authentication is available
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      const available = await biometricService.isAvailable();
      setBiometricAvailable(available);
    };
    
    checkBiometricAvailability();
  }, []);
  
  // Handle login
  const handleLogin = async () => {
    if (!username || !password) {
      setErrorMessage('Please enter both username and password');
      return;
    }
    
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      // First attempt login and check if 2FA is required
      const loginResult = await login(username, password) as unknown as LoginResponse;
      
      if (loginResult.requiresTwoFactor && loginResult.userId) {
        // Navigate to 2FA verification screen with user ID
        navigation.navigate('TwoFactorVerify', { userId: loginResult.userId });
      } else if (!loginResult.success) {
        // Login failed
        setErrorMessage(loginResult.message || 'Invalid username or password');
      }
      // If login was successful without 2FA, the user will be redirected automatically
      
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle biometric authentication
  const handleBiometricLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      
      const result = await biometricService.authenticate('Login using biometrics');
      
      if (result) {
        // Attempt to login with stored credentials
        const storedCredentials = await biometricService.getStoredCredentials();
        
        if (storedCredentials) {
          setUsername(storedCredentials.username);
          setPassword(storedCredentials.password);
          
          // Simulate a small delay for user experience
          setTimeout(() => {
            handleLogin();
          }, 300);
        } else {
          setErrorMessage('No saved credentials found. Please login with your username and password first.');
          setIsLoading(false);
        }
      } else {
        setErrorMessage('Biometric authentication failed');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      setErrorMessage('An error occurred with biometric authentication');
      setIsLoading(false);
    }
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>EvokeEssence</Text>
          <Text style={styles.tagline}>Cryptocurrency Exchange</Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.subtitleText}>Login to your account</Text>
          
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color="#d32f2f" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
          
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username or Email"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!isLoading}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!isLoading}
            />
            <TouchableOpacity 
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.forgotPasswordButton}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
          
          {biometricAvailable && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
              disabled={isLoading}
            >
              <Ionicons name="finger-print-outline" size={24} color="#0066CC" />
              <Text style={styles.biometricButtonText}>Login with Biometrics</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLinkText}>Register</Text>
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
    backgroundColor: '#f5f7fa',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#d32f2f',
    marginLeft: 8,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: '#333',
    fontSize: 16,
  },
  passwordToggle: {
    padding: 8,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#0066CC',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonDisabled: {
    backgroundColor: '#7fb2e5',
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
    backgroundColor: '#f0f4f9',
    borderRadius: 8,
    height: 48,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dde5f0',
  },
  biometricButtonText: {
    color: '#0066CC',
    fontSize: 16,
    marginLeft: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  registerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLinkText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LoginScreen;