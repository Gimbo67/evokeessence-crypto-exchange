import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import websocketService, { WebSocketEventType } from '../services/websocketService';
import PushNotificationService from '../services/pushNotificationService';

// This is a non-visual component that listens for verification status updates
// It shows alerts and handles navigation when verification status changes
const VerificationStatusListener: React.FC = () => {
  const { user, refreshUserInfo } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    // Only set up the listener if the user is logged in
    if (!user) return;

    // Connect to websocket if not already connected
    const setupWebSocket = async () => {
      const connected = await websocketService.connect();
      if (connected) {
        websocketService.subscribeToVerificationUpdates();
      }
    };

    setupWebSocket();

    // Set up listener for verification status updates
    const handleVerificationUpdate = (data: any) => {
      const { status, message } = data;
      
      // Update user info to reflect the new verification status
      refreshUserInfo();
      
      // Show alert with the update message
      Alert.alert(
        `Verification Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message || `Your verification status has been updated to ${status}.`,
        [
          {
            text: 'View Details',
            onPress: () => {
              // Navigate to the verification screen
              navigation.navigate('Verification' as never);
            },
          },
          { text: 'OK', style: 'cancel' },
        ]
      );

      // Handle via notification service as well
      PushNotificationService.handleVerificationStatusUpdate({
        data: { status, message }
      });
    };

    // Subscribe to verification status updates
    websocketService.subscribe(
      WebSocketEventType.VERIFICATION_STATUS,
      handleVerificationUpdate
    );

    // Clean up on unmount
    return () => {
      websocketService.unsubscribe(
        WebSocketEventType.VERIFICATION_STATUS,
        handleVerificationUpdate
      );
    };
  }, [user, navigation, refreshUserInfo]);

  // This component doesn't render anything
  return null;
};

export default VerificationStatusListener;