import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { TRANSAK_API_KEY } from '../config/constants';

interface TransakWidgetProps {
  onClose: () => void;
  defaultCrypto?: string;
}

/**
 * Transak Widget Component
 * 
 * This component integrates the Transak cryptocurrency purchase widget via WebView.
 * It allows users to buy crypto directly within the app using multiple payment methods.
 */
const TransakWidget: React.FC<TransakWidgetProps> = ({ onClose, defaultCrypto = 'BTC' }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);
  const [transakUrl, setTransakUrl] = useState<string>('');
  
  // Create Transak URL with user data
  useEffect(() => {
    if (user) {
      // Get Transak API key from constants
      const transakApiKey = TRANSAK_API_KEY;
      
      // Determine environment - production or staging
      const environment = __DEV__ ? 'staging' : 'production';
      
      // Base URL for Transak widget
      const baseUrl = environment === 'production' 
        ? 'https://global.transak.com/' 
        : 'https://staging-global.transak.com/';
      
      // Build URL parameters
      const params = new URLSearchParams({
        apiKey: transakApiKey,
        defaultCryptoCurrency: defaultCrypto,
        walletAddress: '', // Will be filled from user's wallet if available
        disableWalletAddressForm: 'false',
        exchangeScreenTitle: 'Buy Crypto',
        hideMenu: 'true',
        // Include user info if available
        ...(user.email && { email: user.email }),
        ...(user.firstName && { firstName: user.firstName }),
        ...(user.lastName && { lastName: user.lastName }),
      });
      
      // Set the complete URL
      setTransakUrl(`${baseUrl}?${params.toString()}`);
    }
  }, [user, defaultCrypto]);

  // Handle messages from the WebView
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      // Handle transaction completion
      if (data.eventName === 'TRANSAK_ORDER_SUCCESSFUL') {
        // Transaction was successful
        console.log('Transaction successful:', data.order);
        
        // Close widget after success
        setTimeout(() => {
          onClose();
        }, 3000);
      }
      
      // Handle widget closed by user
      if (data.eventName === 'TRANSAK_WIDGET_CLOSE') {
        onClose();
      }
      
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  // Handle WebView load complete
  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  // Inject JavaScript to handle events
  const injectedJavaScript = `
    window.addEventListener('message', function(event) {
      if (typeof event.data === 'string') {
        try {
          const eventData = JSON.parse(event.data);
          window.ReactNativeWebView.postMessage(event.data);
        } catch (error) {
          console.log('Error parsing event data');
        }
      }
    });
    true;
  `;

  return (
    <View style={styles.container}>
      {/* Header with close button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Buy Cryptocurrency</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      
      {/* WebView loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066FF" />
          <Text style={styles.loadingText}>Loading payment options...</Text>
        </View>
      )}
      
      {/* Transak WebView */}
      {transakUrl ? (
        <WebView
          ref={webViewRef}
          source={{ uri: transakUrl }}
          onLoadEnd={handleLoadEnd}
          onMessage={handleMessage}
          injectedJavaScript={injectedJavaScript}
          style={[styles.webview, isLoading && styles.hidden]}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
        />
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Unable to load payment options. Please try again later.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  closeButton: {
    padding: 4,
  },
  webview: {
    flex: 1,
  },
  hidden: {
    opacity: 0,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    zIndex: 5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555555',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
});

export default TransakWidget;