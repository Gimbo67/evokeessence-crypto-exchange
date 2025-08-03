import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TwoFactorScreen = ({ navigation, route }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [resendDisabled, setResendDisabled] = useState(true);
  const inputRefs = useRef([]);

  const userId = route.params?.userId;
  const email = route.params?.email;
  const token = route.params?.token;

  useEffect(() => {
    let timer;
    if (countdown > 0 && resendDisabled) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setResendDisabled(false);
    }
    return () => clearTimeout(timer);
  }, [countdown, resendDisabled]);

  const handleCodeChange = (text, index) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus to next input
    if (text && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace to move to previous input
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handleVerify = async () => {
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/verify-2fa`, {
        userId,
        token,
        code: verificationCode
      });

      if (response.data && response.data.success) {
        // Store token and user type
        await AsyncStorage.setItem('auth_token', response.data.token);
        await AsyncStorage.setItem('user_type', response.data.user.isAdmin ? 'admin' : 
          response.data.user.isContractor ? 'contractor' : 'client');
        
        // Navigate to appropriate dashboard
        Alert.alert(
          'Success', 
          'Authentication successful',
          [{ text: 'OK', onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
          })}]
        );
      } else {
        Alert.alert('Verification Failed', response.data?.message || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Verification error:', error);
      if (error.response && error.response.data) {
        Alert.alert('Verification Failed', error.response.data.message || 'Server error occurred');
      } else {
        Alert.alert('Network Error', 'Please check your internet connection and try again');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/resend-2fa`, {
        userId,
        email
      });

      if (response.data && response.data.success) {
        Alert.alert('Success', 'A new verification code has been sent to your email');
        setCountdown(60);
        setResendDisabled(true);
      } else {
        Alert.alert('Failed', response.data?.message || 'Failed to resend code');
      }
    } catch (error) {
      console.error('Resend code error:', error);
      Alert.alert('Error', 'Failed to resend verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Two-Factor Authentication</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={80} color="#6200ee" />
        </View>

        <Text style={styles.title}>Verification Required</Text>
        <Text style={styles.description}>
          Please enter the 6-digit verification code sent to your email.
        </Text>

        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={el => inputRefs.current[index] = el}
              style={styles.codeInput}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity 
          style={styles.verifyButton}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code?</Text>
          {resendDisabled ? (
            <Text style={styles.countdownText}>Resend in {countdown}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResendCode} disabled={loading}>
              <Text style={styles.resendButton}>Resend Code</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#6200ee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 32,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    backgroundColor: '#fff',
  },
  verifyButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    marginTop: 24,
    alignItems: 'center',
  },
  resendText: {
    color: '#757575',
    marginRight: 8,
  },
  resendButton: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  countdownText: {
    color: '#9e9e9e',
  },
});

export default TwoFactorScreen;