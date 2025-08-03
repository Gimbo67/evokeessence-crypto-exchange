import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import TransakWidget from '../../components/TransakWidget';

const VerificationScreen = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showTransakWidget, setShowTransakWidget] = useState(false);
  
  // Placeholder - Would be set from API
  const [verificationStatus, setVerificationStatus] = useState<
    'unverified' | 'pending' | 'verified' | 'rejected'
  >('unverified');

  const handleStartKYC = () => {
    // In a real implementation, this would start the SumSub verification flow
    Alert.alert(
      'Start KYC Process',
      'This will open the KYC verification process. You will need to provide identification documents.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            setIsLoading(true);
            // Simulate API call
            setTimeout(() => {
              setVerificationStatus('pending');
              setIsLoading(false);
              Alert.alert(
                'Verification Started',
                'Your verification process has been initiated. Please check your email for further instructions.'
              );
            }, 1500);
          },
        },
      ]
    );
  };

  const handleOpenTransak = () => {
    setShowTransakWidget(true);
  };

  const renderUnverifiedView = () => (
    <View style={styles.contentContainer}>
      <View style={styles.statusCard}>
        <Ionicons name="alert-circle" size={50} color="#FFA000" />
        <Text style={styles.statusTitle}>Account Unverified</Text>
        <Text style={styles.statusDescription}>
          Your account is not verified. Complete the KYC (Know Your Customer) process to unlock all features and higher transaction limits.
        </Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleStartKYC}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>Start Verification</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Limits for Unverified Accounts</Text>
        <View style={styles.limitItem}>
          <Ionicons name="cash-outline" size={24} color="#666" style={styles.limitIcon} />
          <View style={styles.limitDetails}>
            <Text style={styles.limitTitle}>Daily Transaction Limit</Text>
            <Text style={styles.limitValue}>$500 USD</Text>
          </View>
        </View>
        <View style={styles.limitItem}>
          <Ionicons name="sync-outline" size={24} color="#666" style={styles.limitIcon} />
          <View style={styles.limitDetails}>
            <Text style={styles.limitTitle}>Monthly Transaction Limit</Text>
            <Text style={styles.limitValue}>$5,000 USD</Text>
          </View>
        </View>
        <View style={styles.limitItem}>
          <Ionicons name="wallet-outline" size={24} color="#666" style={styles.limitIcon} />
          <View style={styles.limitDetails}>
            <Text style={styles.limitTitle}>Withdrawal Limit</Text>
            <Text style={styles.limitValue}>$2,000 USD</Text>
          </View>
        </View>
      </View>

      <View style={styles.featureSection}>
        <Text style={styles.sectionTitle}>Limited Features</Text>
        <View style={styles.featureGrid}>
          <View style={styles.featureItem}>
            <Ionicons name="close-circle" size={24} color="#F44336" />
            <Text style={styles.featureName}>OTC Trading</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="close-circle" size={24} color="#F44336" />
            <Text style={styles.featureName}>Margin Trading</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="close-circle" size={24} color="#F44336" />
            <Text style={styles.featureName}>Staking</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="close-circle" size={24} color="#F44336" />
            <Text style={styles.featureName}>Higher Limits</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPendingView = () => (
    <View style={styles.contentContainer}>
      <View style={styles.statusCard}>
        <Ionicons name="time" size={50} color="#2196F3" />
        <Text style={styles.statusTitle}>Verification In Progress</Text>
        <Text style={styles.statusDescription}>
          Your account verification is currently being processed. This typically takes 1-3 business days. We'll notify you once the process is complete.
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Next Steps</Text>
        <View style={styles.stepItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepDetails}>
            <Text style={styles.stepTitle}>Document Review</Text>
            <Text style={styles.stepDescription}>
              Our compliance team is reviewing your submitted documents.
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        </View>
        <View style={styles.stepItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepDetails}>
            <Text style={styles.stepTitle}>Identity Verification</Text>
            <Text style={styles.stepDescription}>
              Confirming your identity against government databases.
            </Text>
          </View>
          <Ionicons name="hourglass-outline" size={24} color="#FFA000" />
        </View>
        <View style={styles.stepItem}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepDetails}>
            <Text style={styles.stepTitle}>Final Approval</Text>
            <Text style={styles.stepDescription}>
              Final checks before approval of your verified status.
            </Text>
          </View>
          <Ionicons name="ellipse-outline" size={24} color="#999" />
        </View>
      </View>

      <View style={styles.noteCard}>
        <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
        <Text style={styles.noteText}>
          While your verification is in progress, you can continue using the platform with unverified account limits.
        </Text>
      </View>
    </View>
  );

  const renderVerifiedView = () => (
    <View style={styles.contentContainer}>
      <View style={[styles.statusCard, styles.verifiedCard]}>
        <Ionicons name="shield-checkmark" size={50} color="#4CAF50" />
        <Text style={styles.statusTitle}>Account Fully Verified</Text>
        <Text style={styles.statusDescription}>
          Your account is fully verified. You have access to all features and higher transaction limits.
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Your Upgraded Limits</Text>
        <View style={styles.limitItem}>
          <Ionicons name="cash-outline" size={24} color="#666" style={styles.limitIcon} />
          <View style={styles.limitDetails}>
            <Text style={styles.limitTitle}>Daily Transaction Limit</Text>
            <Text style={styles.limitValue}>$50,000 USD</Text>
          </View>
        </View>
        <View style={styles.limitItem}>
          <Ionicons name="sync-outline" size={24} color="#666" style={styles.limitIcon} />
          <View style={styles.limitDetails}>
            <Text style={styles.limitTitle}>Monthly Transaction Limit</Text>
            <Text style={styles.limitValue}>$500,000 USD</Text>
          </View>
        </View>
        <View style={styles.limitItem}>
          <Ionicons name="wallet-outline" size={24} color="#666" style={styles.limitIcon} />
          <View style={styles.limitDetails}>
            <Text style={styles.limitTitle}>Withdrawal Limit</Text>
            <Text style={styles.limitValue}>$100,000 USD</Text>
          </View>
        </View>
      </View>

      <View style={styles.featureSection}>
        <Text style={styles.sectionTitle}>Unlocked Features</Text>
        <View style={styles.featureGrid}>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.featureName}>OTC Trading</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.featureName}>Margin Trading</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.featureName}>Staking</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.featureName}>Higher Limits</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleOpenTransak}>
        <Text style={styles.primaryButtonText}>Buy Cryptocurrency</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRejectedView = () => (
    <View style={styles.contentContainer}>
      <View style={[styles.statusCard, styles.rejectedCard]}>
        <Ionicons name="close-circle" size={50} color="#F44336" />
        <Text style={styles.statusTitle}>Verification Rejected</Text>
        <Text style={styles.statusDescription}>
          Your account verification could not be completed. Please review the issues below and resubmit your verification.
        </Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleStartKYC}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>Retry Verification</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Issues to Address</Text>
        <View style={styles.issueItem}>
          <Ionicons name="alert-circle" size={24} color="#F44336" />
          <Text style={styles.issueText}>Document quality too low or unclear</Text>
        </View>
        <View style={styles.issueItem}>
          <Ionicons name="alert-circle" size={24} color="#F44336" />
          <Text style={styles.issueText}>Information mismatch between documents</Text>
        </View>
        <View style={styles.issueItem}>
          <Ionicons name="alert-circle" size={24} color="#F44336" />
          <Text style={styles.issueText}>Document expiration date invalid</Text>
        </View>
      </View>

      <View style={styles.noteCard}>
        <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
        <Text style={styles.noteText}>
          If you need assistance with your verification, please contact our support team.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.supportButton}
        onPress={() => Alert.alert('Support', 'Contact support feature will be implemented soon.')}
      >
        <Text style={styles.supportButtonText}>Contact Support</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVerificationView = () => {
    switch (verificationStatus) {
      case 'unverified':
        return renderUnverifiedView();
      case 'pending':
        return renderPendingView();
      case 'verified':
        return renderVerifiedView();
      case 'rejected':
        return renderRejectedView();
      default:
        return renderUnverifiedView();
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account Verification</Text>
      </View>

      {renderVerificationView()}

      {/* Transak Widget */}
      <TransakWidget
        visible={showTransakWidget}
        onClose={() => setShowTransakWidget(false)}
        apiKey="YOUR_TRANSAK_API_KEY" // Replace with actual API key
        environment="STAGING" // Change to 'PRODUCTION' for production
        email={user?.email}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#0066CC',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  contentContainer: {
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  verifiedCard: {
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  rejectedCard: {
    borderColor: '#F44336',
    borderWidth: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  statusDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  limitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  limitIcon: {
    marginRight: 15,
  },
  limitDetails: {
    flex: 1,
  },
  limitTitle: {
    fontSize: 16,
    color: '#333',
  },
  limitValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  featureSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  featureItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  featureName: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepDetails: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  noteCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 10,
  },
  issueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  issueText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    flex: 1,
  },
  supportButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0066CC',
    marginBottom: 20,
  },
  supportButtonText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VerificationScreen;