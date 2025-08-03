import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList
} from 'react-native';
import { Card, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';

const DepositsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('deposit');
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('fiat');
  const [depositHistory, setDepositHistory] = useState([]);
  const [showTransak, setShowTransak] = useState(false);
  const [transakUrl, setTransakUrl] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // Fetch deposit history
  const fetchDepositHistory = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/deposits/history`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setDepositHistory(response.data.deposits);
      }
    } catch (error) {
      console.error('Error fetching deposit history:', error);
      Alert.alert('Error', 'Failed to load deposit history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepositHistory();
  }, []);

  // Handle deposit request
  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      
      if (depositMethod === 'fiat') {
        // Handle FIAT deposit (bank transfer, etc.)
        const response = await axios.post(
          `${API_URL}/api/deposits/fiat`,
          { 
            amount: parseFloat(amount),
            referralCode: referralCode || undefined
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        if (response.data && response.data.success) {
          Alert.alert(
            'Deposit Initiated',
            'Your deposit request has been registered. Please follow the provided bank transfer instructions.',
            [{ text: 'OK', onPress: () => {
              setAmount('');
              fetchDepositHistory();
            }}]
          );
        }
      } else if (depositMethod === 'crypto') {
        // Handle crypto deposit through Transak
        const response = await axios.post(
          `${API_URL}/api/deposits/crypto`,
          { 
            amount: parseFloat(amount),
            referralCode: referralCode || undefined
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        if (response.data && response.data.success) {
          setTransakUrl(response.data.widgetUrl);
          setShowTransak(true);
        }
      }
    } catch (error) {
      console.error('Error creating deposit:', error);
      Alert.alert('Error', 'Failed to process your deposit request');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const renderDepositHistory = () => (
    <View style={styles.historyContainer}>
      <Text style={styles.sectionTitle}>Deposit History</Text>
      
      {depositHistory.length > 0 ? (
        <FlatList
          data={depositHistory}
          renderItem={({ item }) => (
            <Card style={styles.historyCard}>
              <View style={styles.historyCardContent}>
                <View style={styles.depositInfo}>
                  <Text style={styles.depositAmount}>€{item.amount.toFixed(2)}</Text>
                  <Text style={styles.depositDate}>{formatDate(item.createdAt)}</Text>
                  <View style={styles.statusContainer}>
                    <View style={[
                      styles.statusIndicator,
                      item.status === 'completed' ? styles.statusCompleted :
                      item.status === 'pending' ? styles.statusPending :
                      styles.statusFailed
                    ]} />
                    <Text style={styles.depositStatus}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.depositDetails}>
                  <Text style={styles.depositMethod}>
                    {item.method === 'fiat' ? 'Bank Transfer' : 'Crypto'}
                  </Text>
                  {item.referralCode && (
                    <Text style={styles.referralText}>
                      Ref: {item.referralCode}
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          )}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={
            <View style={styles.emptyHistoryContainer}>
              <Text style={styles.emptyHistoryText}>No deposit history</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.emptyHistoryContainer}>
          <Ionicons name="document-text-outline" size={48} color="#bdbdbd" />
          <Text style={styles.emptyHistoryText}>No deposit history yet</Text>
          <Text style={styles.emptyHistorySubText}>Your deposits will appear here</Text>
        </View>
      )}
    </View>
  );

  if (showTransak) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowTransak(false)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Crypto Deposit</Text>
          <View style={styles.headerButton} />
        </View>
        
        <WebView
          source={{ uri: transakUrl }}
          style={styles.webview}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6200ee" />
            </View>
          )}
          onNavigationStateChange={(navState) => {
            // Handle navigation events if needed
            if (navState.url.includes('transaction-completed')) {
              setShowTransak(false);
              fetchDepositHistory();
              Alert.alert('Success', 'Your deposit has been processed successfully');
            }
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Deposit Funds</Text>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'deposit' && styles.activeTab]}
          onPress={() => setActiveTab('deposit')}
        >
          <Text style={[styles.tabText, activeTab === 'deposit' && styles.activeTabText]}>
            Deposit
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
      </View>
      
      {activeTab === 'deposit' ? (
        <ScrollView style={styles.content}>
          <Card style={styles.depositCard}>
            <View style={styles.depositCardContent}>
              <Text style={styles.cardTitle}>Deposit Amount</Text>
              
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>€</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.depositMethodContainer}>
                <Text style={styles.depositMethodLabel}>Deposit Method</Text>
                
                <View style={styles.depositMethodButtons}>
                  <TouchableOpacity
                    style={[
                      styles.methodButton,
                      depositMethod === 'fiat' && styles.activeMethodButton
                    ]}
                    onPress={() => setDepositMethod('fiat')}
                  >
                    <Ionicons 
                      name="cash-outline" 
                      size={22} 
                      color={depositMethod === 'fiat' ? '#fff' : '#616161'} 
                      style={styles.methodIcon}
                    />
                    <Text style={[
                      styles.methodText,
                      depositMethod === 'fiat' && styles.activeMethodText
                    ]}>
                      Bank Transfer
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.methodButton,
                      depositMethod === 'crypto' && styles.activeMethodButton
                    ]}
                    onPress={() => setDepositMethod('crypto')}
                  >
                    <Ionicons 
                      name="logo-bitcoin" 
                      size={22} 
                      color={depositMethod === 'crypto' ? '#fff' : '#616161'} 
                      style={styles.methodIcon}
                    />
                    <Text style={[
                      styles.methodText,
                      depositMethod === 'crypto' && styles.activeMethodText
                    ]}>
                      Cryptocurrency
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.referralContainer}>
                <Text style={styles.referralLabel}>Referral Code (Optional)</Text>
                <TextInput
                  style={styles.referralInput}
                  value={referralCode}
                  onChangeText={setReferralCode}
                  placeholder="Enter referral code"
                  autoCapitalize="characters"
                />
              </View>
              
              <TouchableOpacity
                style={styles.depositButton}
                onPress={handleDeposit}
                disabled={loading || !amount}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="arrow-down" size={18} color="#fff" style={styles.depositButtonIcon} />
                    <Text style={styles.depositButtonText}>Deposit Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Card>
          
          <Card style={styles.infoCard}>
            <View style={styles.infoCardContent}>
              <View style={styles.infoHeader}>
                <Ionicons name="information-circle" size={24} color="#6200ee" />
                <Text style={styles.infoTitle}>Deposit Information</Text>
              </View>
              
              <Text style={styles.infoText}>
                {depositMethod === 'fiat' ? (
                  "Bank transfers may take 1-3 business days to be credited to your account. The minimum deposit amount is €20."
                ) : (
                  "Cryptocurrency deposits are processed through our secure Transak integration. The minimum deposit amount varies by cryptocurrency."
                )}
              </Text>
              
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle" size={18} color="#4caf50" />
                <Text style={styles.infoItemText}>No deposit fees</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="shield-checkmark" size={18} color="#4caf50" />
                <Text style={styles.infoItemText}>Secure and regulated</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="time" size={18} color="#ff9800" />
                <Text style={styles.infoItemText}>
                  {depositMethod === 'fiat' ? 
                    "Processing time: 1-3 business days" : 
                    "Processing time: 10-60 minutes"}
                </Text>
              </View>
            </View>
          </Card>
        </ScrollView>
      ) : (
        renderDepositHistory()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#6200ee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6200ee',
  },
  tabText: {
    fontSize: 16,
    color: '#616161',
  },
  activeTabText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  depositCard: {
    borderRadius: 8,
    marginBottom: 16,
  },
  depositCardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '500',
  },
  depositMethodContainer: {
    marginBottom: 24,
  },
  depositMethodLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  depositMethodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeMethodButton: {
    backgroundColor: '#6200ee',
  },
  methodIcon: {
    marginRight: 8,
  },
  methodText: {
    fontSize: 14,
    color: '#616161',
  },
  activeMethodText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
  },
  referralContainer: {
    marginBottom: 24,
  },
  referralLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  referralInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
  },
  depositButton: {
    backgroundColor: '#6200ee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
  },
  depositButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  depositButtonIcon: {
    marginRight: 8,
  },
  infoCard: {
    borderRadius: 8,
    marginBottom: 24,
  },
  infoCardContent: {
    padding: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 16,
    lineHeight: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoItemText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#424242',
  },
  historyContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  historyCard: {
    marginBottom: 8,
    borderRadius: 8,
  },
  historyCardContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  depositInfo: {
    flex: 1,
  },
  depositAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  depositDate: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusCompleted: {
    backgroundColor: '#4caf50',
  },
  statusPending: {
    backgroundColor: '#ff9800',
  },
  statusFailed: {
    backgroundColor: '#f44336',
  },
  depositStatus: {
    fontSize: 12,
    color: '#616161',
  },
  depositDetails: {
    alignItems: 'flex-end',
  },
  depositMethod: {
    fontSize: 14,
    color: '#616161',
  },
  referralText: {
    fontSize: 12,
    color: '#9e9e9e',
    marginTop: 2,
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#757575',
    marginTop: 8,
  },
  emptyHistorySubText: {
    fontSize: 14,
    color: '#9e9e9e',
    marginTop: 4,
  },
  webview: {
    flex: 1,
  },
});

export default DepositsScreen;