import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Market, Wallet } from '../../types';
import { getMarkets, getWallets } from '../../services/dataService';

const TradeScreen = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [total, setTotal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [marketsData, walletsData] = await Promise.all([
          getMarkets(),
          getWallets(),
        ]);
        
        setMarkets(marketsData);
        setWallets(walletsData);
        
        // Set the first market as default
        if (marketsData.length > 0) {
          setSelectedMarket(marketsData[0]);
          setPrice(marketsData[0].price.toString());
        }
      } catch (error) {
        console.error('Error fetching trade data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate total when amount or price changes
  useEffect(() => {
    const amountValue = parseFloat(amount) || 0;
    const priceValue = parseFloat(price) || 0;
    setTotal(amountValue * priceValue);
  }, [amount, price]);

  const handleSelectMarket = (market: Market) => {
    setSelectedMarket(market);
    setPrice(market.price.toString());
  };

  const handleTradeTypeChange = (type: 'buy' | 'sell') => {
    setTradeType(type);
  };

  const handleSubmitTrade = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    if (!selectedMarket) {
      Alert.alert('Error', 'Please select a market');
      return;
    }

    setIsSubmitting(true);

    // Simulating API call
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Success',
        `Your ${tradeType} order for ${amount} ${selectedMarket.symbol} at ${price} USD has been placed.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setAmount('');
            },
          },
        ]
      );
    }, 1500);
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading trading data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container}>
        {/* Market Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Market</Text>
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.marketSelector}
          >
            {markets.map((market) => (
              <TouchableOpacity
                key={market.id}
                style={[
                  styles.marketButton,
                  selectedMarket?.id === market.id && styles.selectedMarketButton,
                ]}
                onPress={() => handleSelectMarket(market)}
              >
                <Text
                  style={[
                    styles.marketButtonText,
                    selectedMarket?.id === market.id && styles.selectedMarketButtonText,
                  ]}
                >
                  {market.symbol}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Market Info */}
        {selectedMarket && (
          <View style={styles.marketInfoContainer}>
            <View style={styles.marketInfoHeader}>
              <Text style={styles.marketInfoName}>{selectedMarket.name}</Text>
              <Text
                style={[
                  styles.marketInfoChange,
                  selectedMarket.change24h >= 0
                    ? styles.positiveChange
                    : styles.negativeChange,
                ]}
              >
                {selectedMarket.change24h >= 0 ? '+' : ''}
                {selectedMarket.change24h.toFixed(2)}%
              </Text>
            </View>
            <Text style={styles.marketInfoPrice}>
              {formatCurrency(selectedMarket.price)}
            </Text>
          </View>
        )}

        {/* Trade Type Selector */}
        <View style={styles.tradeTypeContainer}>
          <TouchableOpacity
            style={[
              styles.tradeTypeButton,
              tradeType === 'buy' && styles.activeTradeTypeButton,
            ]}
            onPress={() => handleTradeTypeChange('buy')}
          >
            <Text
              style={[
                styles.tradeTypeButtonText,
                tradeType === 'buy' && styles.activeTradeTypeButtonText,
              ]}
            >
              Buy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tradeTypeButton,
              tradeType === 'sell' && styles.activeTradeTypeButton,
            ]}
            onPress={() => handleTradeTypeChange('sell')}
          >
            <Text
              style={[
                styles.tradeTypeButtonText,
                tradeType === 'sell' && styles.activeTradeTypeButtonText,
              ]}
            >
              Sell
            </Text>
          </TouchableOpacity>
        </View>

        {/* Trade Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Amount</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputSuffix}>
                {selectedMarket?.symbol || 'BTC'}
              </Text>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Price</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputSuffix}>USD</Text>
            </View>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              tradeType === 'buy' ? styles.buyButton : styles.sellButton,
            ]}
            onPress={handleSubmitTrade}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {tradeType === 'buy' ? 'Buy' : 'Sell'} {selectedMarket?.symbol || 'BTC'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Available Balance */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          {wallets.map((wallet) => (
            <Text key={wallet.id} style={styles.balanceValue}>
              {wallet.balance} {wallet.currency}
            </Text>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  marketSelector: {
    flexDirection: 'row',
  },
  marketButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 10,
  },
  selectedMarketButton: {
    backgroundColor: '#0066CC',
  },
  marketButtonText: {
    fontSize: 14,
    color: '#666',
  },
  selectedMarketButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  marketInfoContainer: {
    backgroundColor: '#fff',
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  marketInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  marketInfoName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  marketInfoChange: {
    fontSize: 16,
    fontWeight: '600',
  },
  positiveChange: {
    color: '#4CAF50',
  },
  negativeChange: {
    color: '#F44336',
  },
  marketInfoPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  tradeTypeContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  tradeTypeButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTradeTypeButton: {
    backgroundColor: '#0066CC',
  },
  tradeTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTradeTypeButtonText: {
    color: '#fff',
  },
  formContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  input: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputSuffix: {
    paddingRight: 15,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  submitButton: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyButton: {
    backgroundColor: '#4CAF50',
  },
  sellButton: {
    backgroundColor: '#F44336',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  balanceContainer: {
    margin: 20,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  balanceValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
});

export default TradeScreen;