import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  
  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await login(username, password);
      
      if (result.success) {
        if (result.needsTwoFactor) {
          // Navigate to 2FA verification screen
          navigation.navigate('TwoFactorVerify');
        } else {
          // Login successful, navigation will be handled by the app's authentication flow
        }
      } else {
        Alert.alert('Login Failed', result.error || 'Please check your credentials');
      }
    } catch (error) {
      Alert.alert('Login Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRegister = () => {
    navigation.navigate('Register');
  };
  
  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };
  
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>EvokeEssence</Text>
          <Text style={styles.subtitle}>Your Premier Crypto Exchange</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <TouchableOpacity 
            style={styles.forgotPasswordButton}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleRegister}>
              <Text style={styles.registerButton}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>EvokeEssence Mobile</Text>
          <Text style={styles.infoSubtitle}>Trade cryptocurrencies anytime, anywhere</Text>
          
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Text style={styles.featureTitle}>Secure Transactions</Text>
              <Text style={styles.featureDesc}>Enhanced security with 2FA and biometric authentication</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Text style={styles.featureTitle}>Real-time Updates</Text>
              <Text style={styles.featureDesc}>Get instant notifications for market movements and balance changes</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Text style={styles.featureTitle}>Buy Crypto Easily</Text>
              <Text style={styles.featureDesc}>Integrated Transak widget for seamless cryptocurrency purchases</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Text style={styles.featureTitle}>Full Platform Access</Text>
              <Text style={styles.featureDesc}>All features of the web platform, optimized for mobile</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
    flexDirection: 'row',
  },
  formContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0066FF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#0066FF',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#0066FF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    color: '#333',
    fontSize: 14,
  },
  registerButton: {
    color: '#0066FF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
    backgroundColor: '#f9f9ff',
    padding: 30,
    justifyContent: 'center',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066FF',
    marginBottom: 10,
  },
  infoSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  featuresContainer: {
    marginTop: 20,
  },
  featureItem: {
    marginBottom: 25,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  featureDesc: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // Responsive design for small screens
  '@media (max-width: 768px)': {
    scrollContainer: {
      flexDirection: 'column',
    },
    infoContainer: {
      display: 'none',
    },
  }
});