import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../../store/AuthContext';

const UnverifiedDashboardScreen = () => {
  const { user, logout } = useAuth();

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Handle contact support
  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Please contact our support team at support@evokeessence.com for assistance with your account verification.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome, {user?.username}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.verificationCard}>
          <View style={styles.statusIndicator}>
            <View style={styles.pendingDot} />
            <Text style={styles.statusText}>Verification Pending</Text>
          </View>
          
          <Text style={styles.cardTitle}>Account Verification Required</Text>
          
          <Text style={styles.infoText}>
            Your account is currently awaiting verification by our team. This process typically takes 1-2 business days.
          </Text>
          
          <Text style={styles.infoText}>
            Once your account is verified, you'll have full access to all trading features and functionalities.
          </Text>
          
          <View style={styles.nextStepsContainer}>
            <Text style={styles.nextStepsTitle}>What happens next?</Text>
            
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>Our team reviews your account information</Text>
            </View>
            
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>You receive an email notification once verification is complete</Text>
            </View>
            
            <View style={styles.stepItem}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Log back in to access all trading features</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.supportButton}
            onPress={handleContactSupport}
          >
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.learnCard}>
          <Text style={styles.cardTitle}>While You Wait</Text>
          <Text style={styles.learnText}>
            Take this time to learn about cryptocurrency trading and prepare for your investment journey.
          </Text>
          
          <View style={styles.resourcesContainer}>
            <Text style={styles.resourceTitle}>Educational Resources</Text>
            
            <View style={styles.resourceItem}>
              <Text style={styles.resourceName}>Cryptocurrency Basics</Text>
              <Text style={styles.resourceDescription}>
                Learn the fundamentals of blockchain technology and cryptocurrencies.
              </Text>
            </View>
            
            <View style={styles.resourceItem}>
              <Text style={styles.resourceName}>Trading Strategies</Text>
              <Text style={styles.resourceDescription}>
                Understand different trading strategies and risk management techniques.
              </Text>
            </View>
            
            <View style={styles.resourceItem}>
              <Text style={styles.resourceName}>Market Analysis</Text>
              <Text style={styles.resourceDescription}>
                Learn how to analyze cryptocurrency markets and make informed decisions.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#050A30',
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  verificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pendingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF9500',
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF9500',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#050A30',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    marginBottom: 16,
  },
  nextStepsContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  nextStepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#050A30',
    marginBottom: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0A2896',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 12,
    overflow: 'hidden',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
  },
  supportButton: {
    backgroundColor: '#0A2896',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  supportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  learnCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  learnText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
    marginBottom: 20,
  },
  resourcesContainer: {
    marginTop: 8,
  },
  resourceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#050A30',
    marginBottom: 12,
  },
  resourceItem: {
    marginBottom: 16,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A2896',
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
});

export default UnverifiedDashboardScreen;