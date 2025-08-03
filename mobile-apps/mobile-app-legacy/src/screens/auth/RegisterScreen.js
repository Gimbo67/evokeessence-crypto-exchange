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
  Platform,
  ScrollView,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phoneNumber: '',
    countryOfResidence: '',
    gender: '',
    referred_by: ''
  });
  
  const [genderSelection, setGenderSelection] = useState('');
  const { register, loading, error, clearError } = useAuth();

  const handleInputChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };
  
  const selectGender = (gender) => {
    setGenderSelection(gender);
    handleInputChange('gender', gender);
  };

  const handleRegister = async () => {
    // Basic validation
    if (!formData.username || !formData.email || !formData.password || !formData.fullName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    // Remove confirmPassword from data to send
    const { confirmPassword, ...registrationData } = formData;
    
    try {
      const result = await register(registrationData);
      
      if (result.success) {
        Alert.alert(
          'Registration Successful', 
          'Your account has been created successfully. You can now log in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        Alert.alert('Registration Failed', result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Registration error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.logoContainer}>
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>CE</Text>
            </View>
            <Text style={styles.appName}>CryptoEvoke Exchange</Text>
          </View>
          
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Create Account</Text>
            
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Username*</Text>
              <TextInput
                style={styles.input}
                placeholder="Choose a username"
                value={formData.username}
                onChangeText={(text) => handleInputChange('username', text)}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email*</Text>
              <TextInput
                style={styles.input}
                placeholder="Your email address"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password*</Text>
              <TextInput
                style={styles.input}
                placeholder="Create a password"
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                secureTextEntry
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password*</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChangeText={(text) => handleInputChange('confirmPassword', text)}
                secureTextEntry
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Full Name*</Text>
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                value={formData.fullName}
                onChangeText={(text) => handleInputChange('fullName', text)}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Your phone number"
                value={formData.phoneNumber}
                onChangeText={(text) => handleInputChange('phoneNumber', text)}
                keyboardType="phone-pad"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Country of Residence</Text>
              <TextInput
                style={styles.input}
                placeholder="Your country"
                value={formData.countryOfResidence}
                onChangeText={(text) => handleInputChange('countryOfResidence', text)}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    genderSelection === 'male' && styles.genderOptionSelected
                  ]}
                  onPress={() => selectGender('male')}
                >
                  <Text
                    style={[
                      styles.genderText,
                      genderSelection === 'male' && styles.genderTextSelected
                    ]}
                  >
                    Male
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    genderSelection === 'female' && styles.genderOptionSelected
                  ]}
                  onPress={() => selectGender('female')}
                >
                  <Text
                    style={[
                      styles.genderText,
                      genderSelection === 'female' && styles.genderTextSelected
                    ]}
                  >
                    Female
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    genderSelection === 'other' && styles.genderOptionSelected
                  ]}
                  onPress={() => selectGender('other')}
                >
                  <Text
                    style={[
                      styles.genderText,
                      genderSelection === 'other' && styles.genderTextSelected
                    ]}
                  >
                    Other
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Referral Code (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter a referral code if you have one"
                value={formData.referred_by}
                onChangeText={(text) => handleInputChange('referred_by', text)}
                autoCapitalize="none"
              />
            </View>
            
            <TouchableOpacity 
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.registerButtonText}>Register</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => {
                clearError();
                navigation.navigate('Login');
              }}
            >
              <Text style={styles.loginLinkText}>
                Already have an account? Login
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
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
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginHorizontal: 5,
    borderRadius: 5,
    backgroundColor: '#f5f5f5',
  },
  genderOptionSelected: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  genderText: {
    color: '#333',
  },
  genderTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  registerButton: {
    backgroundColor: '#6200ee',
    borderRadius: 5,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    color: '#6200ee',
    fontSize: 16,
  },
});

export default RegisterScreen;