import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const TwoFactorScreen = () => {
  const [code, setCode] = useState('');
  const { verifyTwoFactor, twoFactorUsername, loading, error, clearError } = useAuth();

  const handleVerify = async () => {
    // Basic validation
    if (!code || code.length < 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit verification code');
      return;
    }

    try {
      const result = await verifyTwoFactor(code);
      
      if (!result.success) {
        Alert.alert('Verification Failed', result.error || 'Invalid verification code');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('2FA verification error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        <View style={styles.content}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>CE</Text>
          </View>
          
          <Text style={styles.title}>Two-Factor Authentication</Text>
          
          <Text style={styles.subtitle}>
            Please enter the 6-digit verification code from your authenticator app
          </Text>
          
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          
          <TextInput
            style={styles.codeInput}
            placeholder="Enter verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          
          <TouchableOpacity 
            style={styles.verifyButton}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify</Text>
            )}
          </TouchableOpacity>
          
          <Text style={styles.usernameText}>
            Verifying user: {twoFactorUsername}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    width: '100%',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  codeInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: '100%',
    textAlign: 'center',
    letterSpacing: 5,
    marginBottom: 20,
  },
  verifyButton: {
    backgroundColor: '#6200ee',
    borderRadius: 5,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  usernameText: {
    fontSize: 14,
    color: '#666',
    marginTop: 20,
  },
});

export default TwoFactorScreen;