import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import websocketService, { WebSocketEventType } from '../services/websocketService';

// Transaction types that we want to show notifications for
enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRADE = 'trade',
  COMMISSION = 'commission',
}

// Transaction statuses
enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

// Interface for transaction update data
interface TransactionUpdateData {
  id: number;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  timestamp: string;
  message?: string;
}

// This component listens for transaction updates and shows alerts
const TransactionUpdateListener: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    // Only set up the listener if the user is logged in
    if (!user) return;

    // Connect to websocket if not already connected
    const setupWebSocket = async () => {
      const connected = await websocketService.connect();
      if (connected) {
        websocketService.subscribeToTransactionUpdates();
      }
    };

    setupWebSocket();

    // Handle transaction updates
    const handleTransactionUpdate = (data: TransactionUpdateData) => {
      const { type, status, amount, currency, message } = data;
      
      // Create title and message based on transaction type and status
      let title = '';
      let alertMessage = message || '';
      
      switch (type) {
        case TransactionType.DEPOSIT:
          title = `Deposit ${getStatusText(status)}`;
          if (!alertMessage) {
            alertMessage = `Your deposit of ${amount} ${currency} has been ${status}.`;
          }
          break;
          
        case TransactionType.WITHDRAWAL:
          title = `Withdrawal ${getStatusText(status)}`;
          if (!alertMessage) {
            alertMessage = `Your withdrawal of ${amount} ${currency} has been ${status}.`;
          }
          break;
          
        case TransactionType.TRADE:
          title = `Trade ${getStatusText(status)}`;
          if (!alertMessage) {
            alertMessage = `Your trade of ${amount} ${currency} has been ${status}.`;
          }
          break;
          
        case TransactionType.COMMISSION:
          title = `Commission ${getStatusText(status)}`;
          if (!alertMessage) {
            alertMessage = `Commission of ${amount} ${currency} has been ${status}.`;
          }
          break;
          
        default:
          title = `Transaction ${getStatusText(status)}`;
          if (!alertMessage) {
            alertMessage = `Your transaction of ${amount} ${currency} has been ${status}.`;
          }
      }
      
      // Show alert with transaction update
      Alert.alert(
        title,
        alertMessage,
        [
          {
            text: 'View Details',
            onPress: () => {
              // Navigate to the wallet screen to see transaction details
              navigation.navigate('Wallet' as never);
            },
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
    };

    // Subscribe to transaction updates
    websocketService.subscribe(
      WebSocketEventType.TRANSACTION_UPDATE,
      handleTransactionUpdate
    );

    // Also subscribe to deposit and withdrawal confirmations specifically
    websocketService.subscribe(
      WebSocketEventType.DEPOSIT_CONFIRMATION,
      handleTransactionUpdate
    );
    
    websocketService.subscribe(
      WebSocketEventType.WITHDRAWAL_CONFIRMATION,
      handleTransactionUpdate
    );

    // Clean up on unmount
    return () => {
      websocketService.unsubscribe(
        WebSocketEventType.TRANSACTION_UPDATE,
        handleTransactionUpdate
      );
      
      websocketService.unsubscribe(
        WebSocketEventType.DEPOSIT_CONFIRMATION,
        handleTransactionUpdate
      );
      
      websocketService.unsubscribe(
        WebSocketEventType.WITHDRAWAL_CONFIRMATION,
        handleTransactionUpdate
      );
    };
  }, [user, navigation]);

  // Helper function to get human-readable status text
  const getStatusText = (status: TransactionStatus): string => {
    switch (status) {
      case TransactionStatus.PENDING:
        return 'Pending';
      case TransactionStatus.PROCESSING:
        return 'Processing';
      case TransactionStatus.COMPLETED:
        return 'Completed';
      case TransactionStatus.FAILED:
        return 'Failed';
      case TransactionStatus.CANCELED:
        return 'Canceled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // This component doesn't render anything
  return null;
};

export default TransactionUpdateListener;