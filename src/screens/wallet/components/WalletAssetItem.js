import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalization } from '../../../context/LocalizationContext';

const WalletAssetItem = ({ asset, onPress }) => {
  const { formatCurrency } = useLocalization();
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.leftSection}>
        <Image
          source={{ uri: asset.imageUrl }}
          style={styles.coinIcon}
          defaultSource={require('../../../assets/placeholder-coin.png')}
        />
        <View style={styles.coinInfo}>
          <Text style={styles.coinName}>{asset.name}</Text>
          <Text style={styles.coinSymbol}>{asset.symbol}</Text>
        </View>
      </View>
      
      <View style={styles.rightSection}>
        <Text style={styles.coinValue}>{formatCurrency(asset.value)}</Text>
        <View style={styles.coinPriceContainer}>
          <Text style={styles.coinAmount}>{asset.amount.toFixed(4)} {asset.symbol}</Text>
          <View style={styles.changeContainer}>
            <Ionicons
              name={asset.change24h >= 0 ? 'caret-up' : 'caret-down'}
              size={12}
              color={asset.change24h >= 0 ? '#4caf50' : '#f44336'}
            />
            <Text
              style={[
                styles.changeText,
                asset.change24h >= 0 ? styles.positiveChange : styles.negativeChange
              ]}
            >
              {Math.abs(asset.change24h).toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    elevation: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  coinInfo: {
    justifyContent: 'center',
  },
  coinName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  coinSymbol: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  coinValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  coinPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  coinAmount: {
    fontSize: 12,
    color: '#757575',
    marginRight: 8,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  positiveChange: {
    color: '#4caf50',
  },
  negativeChange: {
    color: '#f44336',
  }
});

export default WalletAssetItem;