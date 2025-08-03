import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../context/AuthContext';

const TransakWidget = ({ visible, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transakUrl, setTransakUrl] = useState('');

  useEffect(() => {
    if (visible && user) {
      // Configure Transak parameters
      const transakConfig = {
        apiKey: 'YOUR_TRANSAK_API_KEY', // Replace with your actual API key
        environment: 'PRODUCTION', // or 'STAGING' for testing
        defaultCryptoCurrency: 'BTC',
        walletAddress: '', // Optional, if you want to pre-fill a crypto address
        defaultPaymentMethod: 'credit_debit_card',
        fiatCurrency: 'USD', // Default fiat currency
        email: user.email || '', // Pre-fill email from user data
        redirectURL: '',
        themeColor: '#6200ee', // Primary color of your app
        hideMenu: true,
        exchangeScreenTitle: 'Buy Crypto on CryptoEvoke'
      };

      // Build Transak URL with query parameters
      const queryParams = new URLSearchParams(transakConfig).toString();
      const url = `https://global.transak.com?${queryParams}`;
      setTransakUrl(url);
    }
  }, [visible, user]);

  const handleWebViewLoad = () => {
    setLoading(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Buy Cryptocurrency</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6200ee" />
            <Text style={styles.loadingText}>Loading Transak...</Text>
          </View>
        )}

        <WebView
          source={{ uri: transakUrl }}
          style={[styles.webView, loading && styles.hidden]}
          onLoad={handleWebViewLoad}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#6200ee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  webView: {
    flex: 1,
  },
  hidden: {
    opacity: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});

export default TransakWidget;