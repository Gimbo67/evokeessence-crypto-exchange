import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from 'react-native-paper';
import { SumsubWebView } from '@sumsub/websdk-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { STORAGE_KEYS } from '../../api/config';

const KYCVerificationScreen = ({ navigation }) => {
  const { user, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sumsubToken, setSumsubToken] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [showWebView, setShowWebView] = useState(false);
  const [steps, setSteps] = useState([
    { id: 'personal_info', title: 'Personal Information', completed: false, current: true },
    { id: 'identity_verification', title: 'Identity Verification', completed: false, current: false },
    { id: 'address_verification', title: 'Address Verification', completed: false, current: false },
    { id: 'review', title: 'Final Review', completed: false, current: false }
  ]);

  useEffect(() => {
    const fetchVerificationStatus = async () => {
      try {
        const response = await ApiService.getKycStatus();
        
        if (response && response.success) {
          setVerificationStatus(response.status);
          
          // Update steps based on verification status
          updateStepsStatus(response.status, response.completedSteps || []);
          
          // If verification is in process or approved, no need to fetch a new token
          if (response.status === 'approved' || response.status === 'rejected') {
            setLoading(false);
            return;
          }
          
          // Fetch SumSub access token for verification widget
          const tokenResponse = await ApiService.getKycAccessToken();
          if (tokenResponse && tokenResponse.success) {
            setSumsubToken(tokenResponse.token);
          }
        }
      } catch (error) {
        console.error('Error fetching verification status:', error);
        Alert.alert('Error', 'Failed to load verification status. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchVerificationStatus();
  }, []);

  // Update steps status based on the verification progress
  const updateStepsStatus = (status, completedSteps = []) => {
    const newSteps = [...steps];
    
    // Mark completed steps
    completedSteps.forEach(stepId => {
      const stepIndex = newSteps.findIndex(step => step.id === stepId);
      if (stepIndex !== -1) {
        newSteps[stepIndex].completed = true;
        newSteps[stepIndex].current = false;
      }
    });
    
    // Determine current step
    if (status !== 'approved' && status !== 'rejected') {
      const currentStepIndex = newSteps.findIndex(step => !step.completed);
      if (currentStepIndex !== -1) {
        newSteps[currentStepIndex].current = true;
      }
    }
    
    // If verification is approved, mark all steps as completed
    if (status === 'approved') {
      newSteps.forEach(step => {
        step.completed = true;
        step.current = false;
      });
    }
    
    setSteps(newSteps);
  };

  // Handle SumSub events
  const handleSumsubMessage = (message) => {
    if (message.type === 'idCheck.applicantStatus') {
      if (message.reviewStatus === 'completed') {
        // Refresh verification status after completion
        refreshVerificationStatus();
      }
    } else if (message.type === 'idCheck.stepCompleted') {
      // Update step status when a step is completed
      const stepId = message.idDocType === 'IDENTITY' ? 'identity_verification' : 
                    message.idDocType === 'SELFIE' ? 'personal_info' : 
                    message.idDocType === 'PROOF_OF_RESIDENCE' ? 'address_verification' : null;
      
      if (stepId) {
        const updatedSteps = steps.map(step => {
          if (step.id === stepId) {
            return { ...step, completed: true, current: false };
          } else if (step.id === getNextStep(stepId)) {
            return { ...step, current: true };
          }
          return step;
        });
        
        setSteps(updatedSteps);
      }
    }
  };

  // Get the next step ID
  const getNextStep = (currentStepId) => {
    const currentIndex = steps.findIndex(step => step.id === currentStepId);
    if (currentIndex < steps.length - 1) {
      return steps[currentIndex + 1].id;
    }
    return null;
  };

  // Refresh verification status
  const refreshVerificationStatus = async () => {
    try {
      setLoading(true);
      
      const response = await ApiService.getKycStatus();
      if (response && response.success) {
        setVerificationStatus(response.status);
        updateStepsStatus(response.status, response.completedSteps || []);
        
        // Refresh user data to update verification status
        await refreshUserData();
      }
    } catch (error) {
      console.error('Error refreshing verification status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Start verification process
  const startVerification = async () => {
    try {
      if (!sumsubToken) {
        const tokenResponse = await ApiService.getKycAccessToken();
        if (tokenResponse && tokenResponse.success) {
          setSumsubToken(tokenResponse.token);
        } else {
          throw new Error('Failed to get verification token');
        }
      }
      
      setShowWebView(true);
    } catch (error) {
      console.error('Error starting verification:', error);
      Alert.alert('Error', 'Failed to start verification process. Please try again.');
    }
  };

  // Render verification status message
  const renderStatusMessage = () => {
    switch (verificationStatus) {
      case 'approved':
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="checkmark-circle" size={64} color="#4caf50" />
            <Text style={styles.statusTitle}>Verification Approved</Text>
            <Text style={styles.statusMessage}>
              Your identity has been successfully verified. You now have full access to all features.
            </Text>
          </View>
        );
      
      case 'rejected':
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="close-circle" size={64} color="#f44336" />
            <Text style={styles.statusTitle}>Verification Rejected</Text>
            <Text style={styles.statusMessage}>
              Unfortunately, your verification was not successful. Please review the feedback below and try again.
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={startVerification}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'pending':
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="time" size={64} color="#ff9800" />
            <Text style={styles.statusTitle}>Verification In Progress</Text>
            <Text style={styles.statusMessage}>
              Your verification is currently being reviewed. This process typically takes 1-2 business days.
            </Text>
          </View>
        );
      
      default:
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="shield-outline" size={64} color="#6200ee" />
            <Text style={styles.statusTitle}>Verification Required</Text>
            <Text style={styles.statusMessage}>
              To comply with regulations and protect your account, we need to verify your identity.
              Please complete the verification process below.
            </Text>
            <TouchableOpacity 
              style={styles.verifyButton}
              onPress={startVerification}
            >
              <Text style={styles.verifyButtonText}>Start Verification</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  // Render SumSub WebView
  if (showWebView && sumsubToken) {
    return (
      <SafeAreaView style={styles.webViewContainer}>
        <View style={styles.webViewHeader}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => {
              setShowWebView(false);
              refreshVerificationStatus();
            }}
          >
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.webViewTitle}>Identity Verification</Text>
        </View>
        
        <SumsubWebView
          accessToken={sumsubToken}
          expirationHandler={() => ApiService.getKycAccessToken().then(res => res.token)}
          onMessage={handleSumsubMessage}
          onError={(error) => {
            console.error('SumSub error:', error);
            Alert.alert('Error', 'Verification error. Please try again.');
            setShowWebView(false);
          }}
          style={styles.webView}
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Identity Verification</Text>
      </View>

      {renderStatusMessage()}

      <Card style={styles.stepsCard}>
        <View style={styles.stepsCardContent}>
          <Text style={styles.stepsTitle}>Verification Steps</Text>
          
          {steps.map((step, index) => (
            <View key={step.id} style={styles.step}>
              <View style={[
                styles.stepCircle,
                step.completed && styles.stepCompleted,
                step.current && styles.stepCurrent
              ]}>
                {step.completed ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                )}
              </View>
              
              <View style={styles.stepInfo}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>
                  {step.id === 'personal_info' && 'Provide your basic personal information and a selfie.'}
                  {step.id === 'identity_verification' && 'Upload your government-issued ID document.'}
                  {step.id === 'address_verification' && 'Provide proof of your current address.'}
                  {step.id === 'review' && 'Your information will be reviewed by our compliance team.'}
                </Text>
              </View>
              
              <View style={styles.stepStatus}>
                {step.completed ? (
                  <Ionicons name="checkmark-circle" size={20} color="#4caf50" />
                ) : step.current ? (
                  <Text style={styles.currentStepText}>Current</Text>
                ) : (
                  <Ionicons name="ellipse-outline" size={20} color="#bdbdbd" />
                )}
              </View>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.infoCard}>
        <View style={styles.infoCardContent}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color="#6200ee" />
            <Text style={styles.infoTitle}>Important Information</Text>
          </View>
          
          <Text style={styles.infoText}>
            Your identity verification is processed securely through our compliance partner SumSub.
            All your personal data is encrypted and handled in accordance with GDPR regulations.
          </Text>
          
          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark" size={18} color="#4caf50" />
            <Text style={styles.infoItemText}>All data is securely encrypted</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="document-text" size={18} color="#4caf50" />
            <Text style={styles.infoItemText}>Compliant with KYC/AML regulations</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Ionicons name="time" size={18} color="#ff9800" />
            <Text style={styles.infoItemText}>Verification takes 1-2 business days</Text>
          </View>
        </View>
      </Card>

      <View style={styles.supportSection}>
        <Text style={styles.supportTitle}>Need Help?</Text>
        <TouchableOpacity 
          style={styles.supportButton}
          onPress={() => navigation.navigate('Support')}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
          <Text style={styles.supportButtonText}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#6200ee',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: 14,
    color: '#616161',
    textAlign: 'center',
    lineHeight: 20,
  },
  verifyButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 24,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#f44336',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  stepsCardContent: {
    padding: 16,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepCompleted: {
    backgroundColor: '#4caf50',
  },
  stepCurrent: {
    backgroundColor: '#6200ee',
  },
  stepNumber: {
    color: '#757575',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepDescription: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  stepStatus: {
    marginLeft: 8,
  },
  currentStepText: {
    fontSize: 12,
    color: '#6200ee',
    fontWeight: 'bold',
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  infoCardContent: {
    padding: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 16,
    lineHeight: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoItemText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#424242',
  },
  supportSection: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  supportButton: {
    backgroundColor: '#6200ee',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 4,
  },
  webViewTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginRight: 32,
  },
  webView: {
    flex: 1,
  },
});

export default KYCVerificationScreen;