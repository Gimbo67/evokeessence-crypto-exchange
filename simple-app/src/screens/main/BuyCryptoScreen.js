import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Alert,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../../context/AuthContext';
import { transakAPI } from '../../services/api';

export default function BuyCryptoScreen({ navigation }) {
  const [transakUrl, setTransakUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { user } = useAuth();
  
  useEffect(() => {
    fetchTransakUrl();
  }, []);
  
  const fetchTransakUrl = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real app, get this from the API
      // const response = await transakAPI.getWidgetURL();
      
      // Simulate API response for demo
      const mockTransakUrl = 'https://global-stg.transak.com/?apiKey=YOUR_TRANSAK_API_KEY' +
        `&walletAddress=${encodeURIComponent('YOUR_WALLET_ADDRESS')}` +
        `&email=${encodeURIComponent(user?.email || '')}` +
        '&cryptoCurrencyCode=USDT,BTC,ETH' +
        '&defaultCryptoCurrency=USDT' +
        '&networks=ethereum,polygon,bsc' +
        '&disableWalletAddressForm=true' +
        '&hideMenu=true' +
        '&exchangeScreenTitle=Buy Crypto on EvokeEssence' +
        '&isFeeCalculationHidden=true' +
        '&themeColor=#0066FF';
      
      setTransakUrl(mockTransakUrl);
    } catch (error) {
      console.error('Error fetching Transak URL:', error);
      setError('Failed to load Transak widget. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNavigationStateChange = (navState) => {
    // Handle WebView navigation events
    if (navState.url.includes('transak.com/order/')) {
      // Extract order ID from URL for verification (in a real app)
      const orderIdMatch = navState.url.match(/order\/([a-zA-Z0-9-]+)/);
      if (orderIdMatch && orderIdMatch[1]) {
        const orderId = orderIdMatch[1];
        console.log('Transak order completed, ID:', orderId);
        
        // In a real app, verify the order with your backend
        // transakAPI.verifyOrder(orderId);
      }
    }
  };
  
  const handleRetry = () => {
    fetchTransakUrl();
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
        <Text style={styles.loadingText}>Loading Transak widget...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Buy Cryptocurrency</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
      
      {transakUrl ? (
        <WebView
          source={{ uri: transakUrl }}
          style={styles.webview}
          onNavigationStateChange={handleNavigationStateChange}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color="#0066FF" />
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            setError('Failed to load Transak widget. Please try again later.');
          }}
        />
      ) : (
        <View style={styles.unavailableContainer}>
          <Text style={styles.unavailableText}>
            Transak widget is currently unavailable. Please try again later.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Need help? Contact support@evokeessence.com
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0066FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    color: '#0066FF',
    fontSize: 16,
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  unavailableContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unavailableText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  footer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
});