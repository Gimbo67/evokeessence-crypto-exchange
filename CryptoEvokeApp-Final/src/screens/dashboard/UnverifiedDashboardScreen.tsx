import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView 
} from 'react-native';
import { useAuth } from '../../store/AuthContext';

const UnverifiedDashboardScreen = () => {
  const { logout } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CryptoEvoke Exchange</Text>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.verificationCard}>
          <View style={styles.warningHeader}>
            <Text style={styles.warningTitle}>Verification Required</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.verificationText}>
              Your account needs to be verified before you can access all features.
            </Text>
            <Text style={styles.verificationSteps}>
              Please complete the following steps:
            </Text>
            <View style={styles.stepList}>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>Verify your email address</Text>
              </View>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>Complete KYC verification</Text>
              </View>
              <View style={styles.step}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>Set up two-factor authentication</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.verifyButton}>
              <Text style={styles.verifyButtonText}>Start Verification</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Why verification is important</Text>
          <Text style={styles.infoText}>
            Verification helps us ensure compliance with regulations and protects our users from fraud. 
            Once verified, you'll have full access to buying, selling, and transferring cryptocurrency.
          </Text>
        </View>
        
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>What you can do now</Text>
          <Text style={styles.infoText}>
            While waiting for verification, you can explore our platform, view real-time market data,
            and learn about cryptocurrency trading through our educational resources.
          </Text>
          <TouchableOpacity style={styles.educationButton}>
            <Text style={styles.educationButtonText}>View Educational Resources</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#4a80f5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  verificationCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  warningHeader: {
    backgroundColor: '#FFC107',
    padding: 12,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  cardContent: {
    padding: 16,
  },
  verificationText: {
    fontSize: 16,
    marginBottom: 16,
    color: '#333',
  },
  verificationSteps: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  stepList: {
    marginBottom: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4a80f5',
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    marginRight: 12,
    overflow: 'hidden',
    lineHeight: 24,
  },
  stepText: {
    fontSize: 16,
    color: '#333',
  },
  verifyButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  educationButton: {
    backgroundColor: '#4a80f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  educationButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default UnverifiedDashboardScreen;