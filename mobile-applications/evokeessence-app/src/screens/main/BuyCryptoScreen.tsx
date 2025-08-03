import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  Platform,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import TransakWidget from '../../components/TransakWidget';

/**
 * BuyCryptoScreen
 * 
 * Screen that allows users to purchase cryptocurrency using the Transak widget.
 * It can be accessed from multiple parts of the app and accepts a defaultCrypto
 * parameter to pre-select a specific cryptocurrency.
 */
const BuyCryptoScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [showTransak, setShowTransak] = useState(false);
  
  // Get the default crypto from route params if available
  const { defaultCrypto = 'BTC' } = route.params || {};

  // Handle opening the Transak widget
  const handleBuyCrypto = () => {
    setShowTransak(true);
  };

  // Handle closing the Transak widget
  const handleCloseTransak = () => {
    setShowTransak(false);
  };

  // If Transak widget is showing, display it
  if (showTransak) {
    return (
      <TransakWidget 
        onClose={handleCloseTransak}
        defaultCrypto={defaultCrypto}
      />
    );
  }

  // Otherwise show the buy crypto intro screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buy Cryptocurrency</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView style={styles.content}>
        {/* Main content */}
        <View style={styles.infoContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="card-outline" size={64} color="#0066FF" />
          </View>
          
          <Text style={styles.title}>Purchase Cryptocurrency</Text>
          
          <Text style={styles.description}>
            Buy cryptocurrency instantly using bank transfer, card payment, or other methods available in your region.
          </Text>
          
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#0066FF" />
              <Text style={styles.benefitText}>Secure and regulated</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <Ionicons name="flash-outline" size={24} color="#0066FF" />
              <Text style={styles.benefitText}>Fast processing times</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <Ionicons name="globe-outline" size={24} color="#0066FF" />
              <Text style={styles.benefitText}>Available in 100+ countries</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <Ionicons name="cash-outline" size={24} color="#0066FF" />
              <Text style={styles.benefitText}>Multiple payment methods</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Buy button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.buyButton}
          onPress={handleBuyCrypto}
        >
          <Text style={styles.buyButtonText}>Continue to Payment</Text>
        </TouchableOpacity>
        
        <Text style={styles.disclaimer}>
          Powered by Transak. All purchases are subject to verification procedures and applicable limits.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  infoContainer: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 102, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    color: '#000000',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 32,
    lineHeight: 24,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingLeft: 8,
  },
  benefitText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 12,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  buyButton: {
    backgroundColor: '#0066FF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default BuyCryptoScreen;