import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';

import { AuthContext } from '../../store/AuthContext';
import { apiClient } from '../../api/apiClient';

const UnverifiedDashboardScreen = () => {
  const { userData, logout } = useContext(AuthContext);

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => logout() },
      ]
    );
  };

  // Handle KYC submission
  const handleStartKYC = async () => {
    try {
      const response = await apiClient.getKYCStatus();
      
      if (response.status === 'pending') {
        Alert.alert(
          'Verification Pending',
          'Your verification is already being processed. We will notify you once it is complete.'
        );
      } else {
        // In a real app, this would navigate to a KYC flow
        Alert.alert(
          'Start Verification',
          'You will now be guided through the verification process. Please have your ID documents ready.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Start', onPress: () => console.log('Start KYC flow') }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking KYC status:', error);
      Alert.alert('Error', 'Failed to check verification status');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome, {userData?.username}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Verification Required Card */}
      <View style={styles.verificationCard}>
        <Text style={styles.verificationTitle}>Verification Required</Text>
        <Text style={styles.verificationText}>
          Your account needs to be verified before you can access all features.
          Complete the verification process to:
        </Text>
        
        <View style={styles.benefitItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.benefitText}>Trade cryptocurrencies</Text>
        </View>
        <View style={styles.benefitItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.benefitText}>Deposit and withdraw funds</Text>
        </View>
        <View style={styles.benefitItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.benefitText}>Access advanced trading features</Text>
        </View>
        <View style={styles.benefitItem}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.benefitText}>Earn referral bonuses</Text>
        </View>

        <TouchableOpacity 
          style={styles.verifyButton} 
          onPress={handleStartKYC}
        >
          <Text style={styles.verifyButtonText}>Verify My Account</Text>
        </TouchableOpacity>
      </View>

      {/* Why Verify Section */}
      <View style={styles.whyVerifyCard}>
        <Text style={styles.sectionTitle}>Why Verify Your Account?</Text>
        <Text style={styles.whyVerifyText}>
          Account verification helps us provide a secure trading environment and comply with regulatory requirements.
        </Text>
        
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Text style={styles.infoTitle}>Fast & Simple</Text>
            <Text style={styles.infoText}>
              Our verification process typically takes less than 24 hours to complete.
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoTitle}>Secure & Confidential</Text>
            <Text style={styles.infoText}>
              Your personal information is encrypted and stored securely.
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoTitle}>24/7 Support</Text>
            <Text style={styles.infoText}>
              Our support team is available to help you with any questions.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#050A30',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  verificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  verificationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#050A30',
    marginBottom: 10,
  },
  verificationText: {
    fontSize: 16,
    color: '#444',
    marginBottom: 15,
    lineHeight: 22,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 18,
    color: '#050A30',
    marginRight: 8,
  },
  benefitText: {
    fontSize: 16,
    color: '#444',
  },
  verifyButton: {
    backgroundColor: '#050A30',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  whyVerifyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    margin: 16,
    marginTop: 0,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#050A30',
    marginBottom: 15,
  },
  whyVerifyText: {
    fontSize: 16,
    color: '#444',
    marginBottom: 20,
    lineHeight: 22,
  },
  infoSection: {
    marginTop: 10,
  },
  infoItem: {
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default UnverifiedDashboardScreen;