import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import websocketService, { WebSocketEventType } from '../services/websocketService';

interface PriceData {
  symbol: string;
  price: number;
  changePercent: number;
  changeAmount: number;
  lastUpdated: number;
}

interface RealTimeMarketTickerProps {
  symbols?: string[];
  onSelectSymbol?: (symbol: string) => void;
}

const RealTimeMarketTicker = ({ 
  symbols = ['BTC', 'ETH', 'XRP', 'SOL', 'DOT'], 
  onSelectSymbol 
}: RealTimeMarketTickerProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [priceData, setPriceData] = useState<{ [key: string]: PriceData }>({});
  const [flashAnimation] = useState<{ [key: string]: Animated.Value }>({});
  
  // Initialize animation values for each symbol
  useEffect(() => {
    symbols.forEach(symbol => {
      if (!flashAnimation[symbol]) {
        flashAnimation[symbol] = new Animated.Value(0);
      }
    });
  }, [symbols]);
  
  // Connect to WebSocket and subscribe to price updates
  useEffect(() => {
    const connectAndSubscribe = async () => {
      setIsLoading(true);
      
      // Connect to WebSocket
      const connected = await websocketService.connect();
      if (connected) {
        // Subscribe to price updates for specified symbols
        websocketService.subscribeToPriceUpdates(symbols);
      }
      
      setIsLoading(false);
    };
    
    connectAndSubscribe();
    
    // Subscribe to price updates
    websocketService.subscribe(WebSocketEventType.PRICE_UPDATE, handlePriceUpdate);
    
    // Subscribe to connection status changes
    websocketService.subscribeToConnectionStatus(setIsConnected);
    
    return () => {
      // Unsubscribe from price updates
      websocketService.unsubscribe(WebSocketEventType.PRICE_UPDATE, handlePriceUpdate);
      
      // Unsubscribe from connection status changes
      websocketService.unsubscribeFromConnectionStatus(setIsConnected);
      
      // If component unmounts, unsubscribe from price updates
      if (websocketService.isSocketConnected()) {
        websocketService.unsubscribeFromPriceUpdates(symbols);
      }
    };
  }, []);
  
  // Handle price update from WebSocket
  const handlePriceUpdate = (data: PriceData) => {
    // Check if we already have data for this symbol
    const previousPrice = priceData[data.symbol]?.price;
    
    // Update price data
    setPriceData(prevData => ({
      ...prevData,
      [data.symbol]: {
        ...data,
        lastUpdated: Date.now(),
      },
    }));
    
    // Trigger flash animation if price changed
    if (previousPrice !== undefined && previousPrice !== data.price) {
      const flashColor = previousPrice < data.price ? '#4CAF50' : '#F44336';
      triggerFlashAnimation(data.symbol, flashColor);
    }
  };
  
  // Trigger flash animation
  const triggerFlashAnimation = (symbol: string, flashColor: string) => {
    if (flashAnimation[symbol]) {
      Animated.sequence([
        Animated.timing(flashAnimation[symbol], {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(flashAnimation[symbol], {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };
  
  // Get interpolated background color for flash animation
  const getBackgroundColor = (symbol: string, flashColor: string) => {
    return flashAnimation[symbol]?.interpolate({
      inputRange: [0, 1],
      outputRange: ['transparent', flashColor],
    });
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
  
  // Format large numbers with abbreviations (K, M, B)
  const formatLargeNumber = (value: number) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`;
    } else {
      return value.toFixed(2);
    }
  };
  
  // Format percent change
  const formatPercentChange = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };
  
  // Handle symbol selection
  const handleSymbolPress = (symbol: string) => {
    if (onSelectSymbol) {
      onSelectSymbol(symbol);
    }
  };
  
  // Render connection status indicator
  const renderConnectionStatus = () => {
    return (
      <View style={styles.connectionStatusContainer}>
        <View 
          style={[
            styles.connectionStatusIndicator, 
            isConnected ? styles.connected : styles.disconnected
          ]} 
        />
        <Text style={styles.connectionStatusText}>
          {isConnected ? 'Connected - Live Updates' : 'Disconnected'}
        </Text>
      </View>
    );
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#0066CC" />
        <Text style={styles.loadingText}>Connecting to market data...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {renderConnectionStatus()}
      
      <ScrollView 
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {symbols.map(symbol => {
          const data = priceData[symbol];
          const isPositive = data?.changePercent >= 0;
          
          return (
            <TouchableOpacity
              key={symbol}
              style={styles.tickerItem}
              onPress={() => handleSymbolPress(symbol)}
              activeOpacity={0.7}
            >
              <Animated.View
                style={[
                  styles.tickerItemInner,
                  data && {
                    backgroundColor: getBackgroundColor(
                      symbol,
                      isPositive ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'
                    ),
                  },
                ]}
              >
                <Text style={styles.symbolText}>{symbol}</Text>
                
                {data ? (
                  <>
                    <Text style={styles.priceText}>
                      {formatCurrency(data.price)}
                    </Text>
                    
                    <View style={styles.changeContainer}>
                      <Ionicons 
                        name={isPositive ? 'arrow-up' : 'arrow-down'} 
                        size={12} 
                        color={isPositive ? '#4CAF50' : '#F44336'} 
                      />
                      <Text 
                        style={[
                          styles.changeText,
                          isPositive ? styles.positiveChange : styles.negativeChange,
                        ]}
                      >
                        {formatPercentChange(data.changePercent)}
                      </Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.loadingPrice}>
                    <ActivityIndicator size="small" color="#0066CC" />
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    marginVertical: 10,
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  connectionStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 8,
  },
  connectionStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connected: {
    backgroundColor: '#4CAF50',
  },
  disconnected: {
    backgroundColor: '#F44336',
  },
  connectionStatusText: {
    fontSize: 12,
    color: '#666',
  },
  tickerItem: {
    marginHorizontal: 5,
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 120,
  },
  tickerItemInner: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  symbolText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 12,
    marginLeft: 2,
  },
  positiveChange: {
    color: '#4CAF50',
  },
  negativeChange: {
    color: '#F44336',
  },
  loadingPrice: {
    height: 40,
    justifyContent: 'center',
  },
});

export default RealTimeMarketTicker;