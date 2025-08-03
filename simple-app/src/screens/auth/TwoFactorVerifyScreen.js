import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function TwoFactorVerifyScreen({ navigation }) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const inputRefs = useRef([]);
  const codeLength = 6;
  
  const { verify2FA } = useAuth();
  
  // Set up countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);
  
  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await verify2FA(code);
      
      if (result.success) {
        // Verification successful, navigation will be handled by the app's authentication flow
      } else {
        Alert.alert('Verification Failed', result.error || 'Invalid code. Please try again.');
      }
    } catch (error) {
      Alert.alert('Verification Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResendCode = () => {
    // In a real app, this would call an API to resend the 2FA code
    Alert.alert('Code Resent', 'A new verification code has been sent to your registered device.');
    setCountdown(30);
  };
  
  const handleCodeChange = (text) => {
    // Only allow digits
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setCode(cleaned);
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Please enter the 6-digit verification code from your authenticator app
        </Text>
        
        <View style={styles.codeContainer}>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            autoFocus
          />
          
          <View style={styles.digitDisplay}>
            {Array(codeLength).fill(0).map((_, index) => (
              <View key={index} style={styles.digitBox}>
                <Text style={styles.digit}>
                  {code[index] || ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.verifyButton}
          onPress={handleVerify}
          disabled={isLoading || code.length !== 6}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.resendContainer}>
          {countdown > 0 ? (
            <Text style={styles.countdownText}>Resend code in {countdown}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResendCode}>
              <Text style={styles.resendButton}>Resend Code</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.helpButton}
          onPress={() => Alert.alert('Help', 'If you're having trouble, please contact support at support@evokeessence.com')}
        >
          <Text style={styles.helpButtonText}>Need Help?</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  codeInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  digitDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
  },
  digitBox: {
    width: 40,
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digit: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  verifyButton: {
    backgroundColor: '#0066FF',
    padding: 15,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    marginBottom: 20,
  },
  countdownText: {
    color: '#999',
    fontSize: 14,
  },
  resendButton: {
    color: '#0066FF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  helpButton: {
    padding: 10,
  },
  helpButtonText: {
    color: '#0066FF',
    fontSize: 14,
  }
});