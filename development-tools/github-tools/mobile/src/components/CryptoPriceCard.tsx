import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Cryptocurrency } from '../services/MarketDataService';

interface CryptoPriceCardProps {
  crypto: Cryptocurrency;
  onPress?: () => void;
}

const CryptoPriceCard: React.FC<CryptoPriceCardProps> = ({ crypto, onPress }) => {
  const isPositiveChange = crypto.change24h >= 0;
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.leftContent}>
        <Image 
          source={{ uri: crypto.imageUrl }} 
          style={styles.icon} 
          defaultSource={require('../assets/default-coin.png')}
        />
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{crypto.name}</Text>
          <Text style={styles.symbol}>{crypto.symbol.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.rightContent}>
        <Text style={styles.price}>${crypto.price.toLocaleString()}</Text>
        <Text style={[
          styles.change,
          isPositiveChange ? styles.positiveChange : styles.negativeChange
        ]}>
          {isPositiveChange ? '+' : ''}{crypto.change24h.toFixed(2)}%
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  nameContainer: {
    flexDirection: 'column',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  symbol: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  change: {
    fontSize: 14,
    marginTop: 4,
  },
  positiveChange: {
    color: '#10B981',
  },
  negativeChange: {
    color: '#EF4444',
  },
});

export default CryptoPriceCard;