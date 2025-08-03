import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Image,
  Alert,
  ActivityIndicator,
  Clipboard,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import twoFactorAuthService from '../../services/twoFactorAuthService';
import biometricService from '../../services/biometricService';

// Two-factor authentication setup and management screen
const TwoFactorAuthScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  
  // Request biometric authentication if required
  useEffect(() => {
    const authenticateIfNeeded = async () => {
      if (await biometricService.isAvailable()) {
        const authenticated = await biometricService.authenticate(
          'Authenticate to access security settings'
        );
        if (!authenticated) {
          navigation.goBack();
        }
      }
    };
    
    authenticateIfNeeded();
  }, [navigation]);
  
  // Check current 2FA status on mount
  useEffect(() => {
    const checkTwoFactorStatus = async () => {
      setIsLoading(true);
      const isEnabled = await twoFactorAuthService.isTwoFactorEnabled();
      setTwoFactorEnabled(isEnabled);
      
      if (isEnabled) {
        // If 2FA is enabled, fetch backup codes
        const codes = await twoFactorAuthService.getBackupCodes();
        setBackupCodes(codes);
      }
      
      setIsLoading(false);
    };
    
    checkTwoFactorStatus();
  }, []);
  
  // Handle setup button press
  const handleSetup = async () => {
    setIsSettingUp(true);
    const result = await twoFactorAuthService.setupTwoFactor();
    
    if (result.success) {
      setQrCodeUrl(result.qrCodeUrl);
      setSecret(result.secret);
    } else {
      setIsSettingUp(false);
    }
  };
  
  // Handle verification of 2FA setup
  const handleVerifySetup = async () => {
    if (verificationCode.length < 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-digit verification code');
      return;
    }
    
    setIsLoading(true);
    const success = await twoFactorAuthService.verifySetup(verificationCode);
    
    if (success) {
      setTwoFactorEnabled(true);
      setIsSettingUp(false);
      const codes = await twoFactorAuthService.getBackupCodes();
      setBackupCodes(codes);
      Alert.alert(
        'Success',
        'Two-factor authentication has been enabled successfully. Please save your backup codes.'
      );
    }
    
    setIsLoading(false);
    setVerificationCode('');
  };
  
  // Handle disabling 2FA
  const handleDisable = () => {
    Alert.alert(
      'Disable Two-Factor Authentication',
      'Are you sure you want to disable two-factor authentication? This will reduce the security of your account.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: promptForCode,
        },
      ]
    );
  };
  
  // Prompt for verification code to disable 2FA
  const promptForCode = () => {
    Alert.prompt(
      'Enter Verification Code',
      'Please enter your current authentication code to disable 2FA:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disable',
          onPress: disableTwoFactor,
        },
      ],
      'plain-text'
    );
  };
  
  // Disable 2FA with verification code
  const disableTwoFactor = async (code: string) => {
    if (!code || code.length < 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-digit verification code');
      return;
    }
    
    setIsLoading(true);
    const success = await twoFactorAuthService.disableTwoFactor(code);
    
    if (success) {
      setTwoFactorEnabled(false);
      setBackupCodes([]);
      Alert.alert('Success', 'Two-factor authentication has been disabled');
    }
    
    setIsLoading(false);
  };
  
  // Generate new backup codes
  const handleGenerateNewBackupCodes = async () => {
    Alert.alert(
      'Generate New Backup Codes',
      'Are you sure you want to generate new backup codes? This will invalidate all your existing backup codes.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Generate',
          onPress: async () => {
            setIsLoading(true);
            const newCodes = await twoFactorAuthService.generateNewBackupCodes();
            if (newCodes && newCodes.length > 0) {
              setBackupCodes(newCodes);
              Alert.alert(
                'Success',
                'New backup codes have been generated. Please save them securely.'
              );
            }
            setIsLoading(false);
          },
        },
      ]
    );
  };
  
  // Copy secret to clipboard
  const copySecretToClipboard = () => {
    Clipboard.setString(secret);
    Alert.alert('Copied', 'Secret key copied to clipboard');
  };
  
  // Copy backup codes to clipboard
  const copyBackupCodesToClipboard = () => {
    Clipboard.setString(backupCodes.join('\n'));
    Alert.alert('Copied', 'Backup codes copied to clipboard');
  };
  
  // Share backup codes
  const shareBackupCodes = async () => {
    try {
      await Share.share({
        message: 'Your EvokeEssence backup codes:\n\n' + backupCodes.join('\n'),
        title: 'EvokeEssence Backup Codes',
      });
    } catch (error) {
      console.error('Error sharing backup codes:', error);
    }
  };
  
  // Cancel setup process
  const cancelSetup = () => {
    setIsSettingUp(false);
    setQrCodeUrl('');
    setSecret('');
    setVerificationCode('');
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading security settings...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Two-Factor Authentication</Text>
        <Text style={styles.headerSubtitle}>
          Enhance your account security by requiring a second form of verification
        </Text>
      </View>
      
      {!isSettingUp && !twoFactorEnabled && (
        <View style={styles.section}>
          <View style={styles.statusContainer}>
            <Ionicons name="shield-outline" size={28} color="#888" />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>Not Enabled</Text>
              <Text style={styles.statusDescription}>
                Your account is not protected with two-factor authentication
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleSetup}>
            <Text style={styles.actionButtonText}>Set Up Two-Factor Authentication</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>What is Two-Factor Authentication?</Text>
            <Text style={styles.infoText}>
              Two-factor authentication adds an extra layer of security to your account.
              In addition to your password, you'll need to enter a code from an authenticator
              app on your phone when logging in.
            </Text>
          </View>
        </View>
      )}
      
      {isSettingUp && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Set Up Two-Factor Authentication</Text>
          
          <View style={styles.setupSteps}>
            <View style={styles.setupStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Download an Authenticator App</Text>
                <Text style={styles.stepDescription}>
                  If you haven't already, download an authenticator app like Google Authenticator,
                  Microsoft Authenticator, or Authy.
                </Text>
              </View>
            </View>
            
            <View style={styles.setupStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Scan QR Code or Enter Secret Key</Text>
                <Text style={styles.stepDescription}>
                  Scan the QR code below with your authenticator app. If you can't scan the code,
                  enter the secret key manually.
                </Text>
                
                {qrCodeUrl ? (
                  <View style={styles.qrCodeContainer}>
                    <Image
                      source={{ uri: qrCodeUrl }}
                      style={styles.qrCode}
                      resizeMode="contain"
                    />
                  </View>
                ) : (
                  <ActivityIndicator style={styles.qrLoading} color="#0066CC" />
                )}
                
                {secret && (
                  <View style={styles.secretKeyContainer}>
                    <Text style={styles.secretKeyLabel}>Secret Key:</Text>
                    <Text style={styles.secretKey}>{secret}</Text>
                    <TouchableOpacity 
                      style={styles.copyButton}
                      onPress={copySecretToClipboard}
                    >
                      <Ionicons name="copy-outline" size={20} color="#0066CC" />
                      <Text style={styles.copyButtonText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.setupStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Enter Verification Code</Text>
                <Text style={styles.stepDescription}>
                  Enter the 6-digit code shown in your authenticator app to verify setup
                </Text>
                
                <TextInput
                  style={styles.codeInput}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="Enter 6-digit code"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelSetup}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.verifyButton,
                (!verificationCode || verificationCode.length < 6) && styles.disabledButton
              ]}
              onPress={handleVerifySetup}
              disabled={!verificationCode || verificationCode.length < 6}
            >
              <Text style={styles.verifyButtonText}>Verify & Enable</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {!isSettingUp && twoFactorEnabled && (
        <View style={styles.section}>
          <View style={styles.statusContainer}>
            <Ionicons name="shield-checkmark" size={28} color="#4CAF50" />
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitleEnabled}>Enabled</Text>
              <Text style={styles.statusDescription}>
                Your account is protected with two-factor authentication
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.disableButton} onPress={handleDisable}>
            <Text style={styles.disableButtonText}>Disable Two-Factor Authentication</Text>
          </TouchableOpacity>
          
          <View style={styles.backupCodesContainer}>
            <Text style={styles.backupCodesTitle}>Backup Codes</Text>
            <Text style={styles.backupCodesDescription}>
              If you can't access your authenticator app, you can use one of these backup codes
              to sign in. Each code can only be used once.
            </Text>
            
            <View style={styles.backupCodesList}>
              {backupCodes.map((code, index) => (
                <View key={index} style={styles.backupCode}>
                  <Text style={styles.backupCodeText}>{code}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.backupCodesActions}>
              <TouchableOpacity 
                style={styles.backupCodesAction}
                onPress={copyBackupCodesToClipboard}
              >
                <Ionicons name="copy-outline" size={20} color="#0066CC" />
                <Text style={styles.backupCodesActionText}>Copy Codes</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.backupCodesAction}
                onPress={shareBackupCodes}
              >
                <Ionicons name="share-outline" size={20} color="#0066CC" />
                <Text style={styles.backupCodesActionText}>Share Codes</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.backupCodesAction}
                onPress={handleGenerateNewBackupCodes}
              >
                <Ionicons name="refresh-outline" size={20} color="#0066CC" />
                <Text style={styles.backupCodesActionText}>Generate New Codes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security Recommendations</Text>
        
        <View style={styles.recommendationItem}>
          <Ionicons name="lock-closed-outline" size={24} color="#0066CC" style={styles.recommendationIcon} />
          <View style={styles.recommendationContent}>
            <Text style={styles.recommendationTitle}>Use a Strong Password</Text>
            <Text style={styles.recommendationText}>
              Create a unique password with a mix of letters, numbers, and special characters
            </Text>
          </View>
        </View>
        
        <View style={styles.recommendationItem}>
          <Ionicons name="refresh-outline" size={24} color="#0066CC" style={styles.recommendationIcon} />
          <View style={styles.recommendationContent}>
            <Text style={styles.recommendationTitle}>Update Regularly</Text>
            <Text style={styles.recommendationText}>
              Change your password periodically and keep your authenticator app updated
            </Text>
          </View>
        </View>
        
        <View style={styles.recommendationItem}>
          <Ionicons name="finger-print-outline" size={24} color="#0066CC" style={styles.recommendationIcon} />
          <View style={styles.recommendationContent}>
            <Text style={styles.recommendationTitle}>Enable Biometric Authentication</Text>
            <Text style={styles.recommendationText}>
              Use fingerprint or face recognition for an additional layer of security on your device
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
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    margin: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#888',
    marginBottom: 4,
  },
  statusTitleEnabled: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4CAF50',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
  },
  actionButton: {
    backgroundColor: '#0066CC',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  infoContainer: {
    backgroundColor: '#f0f4f8',
    borderRadius: 8,
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  setupSteps: {
    marginTop: 10,
  },
  setupStep: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  qrCode: {
    width: 200,
    height: 200,
  },
  qrLoading: {
    margin: 30,
  },
  secretKeyContainer: {
    backgroundColor: '#f0f4f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  secretKeyLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  secretKey: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyButtonText: {
    fontSize: 14,
    color: '#0066CC',
    marginLeft: 4,
  },
  codeInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    letterSpacing: 4,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  verifyButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    borderRadius: 8,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#aaa',
  },
  disableButton: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  disableButtonText: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '500',
  },
  backupCodesContainer: {
    marginTop: 8,
  },
  backupCodesTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  backupCodesDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  backupCodesList: {
    backgroundColor: '#f0f4f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  backupCode: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backupCodeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    letterSpacing: 1,
  },
  backupCodesActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  backupCodesAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    borderRadius: 8,
    padding: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  backupCodesActionText: {
    fontSize: 14,
    color: '#0066CC',
    marginLeft: 4,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
  },
  recommendationIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default TwoFactorAuthScreen;