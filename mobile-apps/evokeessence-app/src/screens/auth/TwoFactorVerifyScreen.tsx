import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import twoFactorAuthService from '../../services/twoFactorAuthService';

// 2FA verification screen during login
const TwoFactorVerifyScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { userId: string | number };
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [usingBackupCode, setUsingBackupCode] = useState(false);
  const inputRef = useRef<TextInput>(null);
  
  // Focus the input field when screen mounts
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);
  
  // Handle verification code submission
  const handleVerify = async () => {
    if (!verificationCode) {
      setIsError(true);
      setErrorMessage('Please enter the verification code');
      return;
    }
    
    if (!usingBackupCode && verificationCode.length !== 6) {
      setIsError(true);
      setErrorMessage('Please enter a valid 6-digit verification code');
      return;
    }
    
    try {
      setIsLoading(true);
      Keyboard.dismiss();
      
      // Send verification code to server
      const result = await twoFactorAuthService.verifyLogin(
        params.userId,
        verificationCode
      );
      
      if (result.success) {
        // Navigate to main app
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' as never }],
        });
      } else {
        setIsError(true);
        setErrorMessage('Invalid verification code. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      setIsError(true);
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle between regular 2FA code and backup code input
  const toggleInputMode = () => {
    setUsingBackupCode(!usingBackupCode);
    setVerificationCode('');
    setIsError(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };
  
  // Handle input change
  const handleInputChange = (text: string) => {
    setVerificationCode(text);
    
    if (isError) {
      setIsError(false);
    }
  };
  
  // Go back to login screen
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <Image 
            source={require('../../assets/images/2fa-shield.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          
          <Text style={styles.title}>
            {usingBackupCode 
              ? 'Enter Backup Code' 
              : 'Two-Factor Verification'}
          </Text>
          
          <Text style={styles.subtitle}>
            {usingBackupCode
              ? 'Enter a backup code from your list of recovery codes'
              : 'Enter the 6-digit code from your authenticator app'}
          </Text>
          
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={[styles.input, isError && styles.inputError]}
              value={verificationCode}
              onChangeText={handleInputChange}
              placeholder={usingBackupCode ? "Enter backup code" : "Enter 6-digit code"}
              keyboardType={usingBackupCode ? "default" : "number-pad"}
              maxLength={usingBackupCode ? 10 : 6}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            {isError && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}
          </View>
          
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Verify</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toggleModeButton}
            onPress={toggleInputMode}
          >
            <Text style={styles.toggleModeText}>
              {usingBackupCode
                ? 'Use authenticator code instead'
                : 'Use backup code instead'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.helpText}>
            Having trouble? Contact our support team for assistance.
          </Text>
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
    justifyContent: 'space-between',
  },
  header: {
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 4,
  },
  inputError: {
    borderColor: '#d32f2f',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#aaa',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleModeButton: {
    paddingVertical: 12,
  },
  toggleModeText: {
    color: '#0066CC',
    fontSize: 16,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default TwoFactorVerifyScreen;