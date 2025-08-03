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
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Card, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import errorHandler from '../../utils/ErrorHandler';

const WithdrawScreen = ({ navigation }) => {
  const { user, updateActivity } = useAuth();
  const { t, formatCurrency } = useLocalization();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bank');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [cryptoAddresses, setCryptoAddresses] = useState([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [selectedCryptoAddress, setSelectedCryptoAddress] = useState('');
  const [withdrawFee, setWithdrawFee] = useState(0);
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState(10);
  const [maxWithdrawalAmount, setMaxWithdrawalAmount] = useState(10000);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactorInput, setShowTwoFactorInput] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState(false);
  const [balance, setBalance] = useState(0);

  // Load withdrawal data and user balance
  useEffect(() => {
    const loadWithdrawalData = async () => {
      try {
        // Get user balance
        const response = await ApiService.getUserDashboard();
        if (response.success) {
          setBalance(response.data.balance);
        }
        
        // Get bank accounts
        const bankAccountsResponse = await ApiService.getBankAccounts();
        if (bankAccountsResponse.success) {
          setBankAccounts(bankAccountsResponse.accounts);
          if (bankAccountsResponse.accounts.length > 0) {
            setSelectedBankAccount(bankAccountsResponse.accounts[0].id);
          }
        }
        
        // Get crypto withdrawal addresses
        const addressesResponse = await ApiService.getWithdrawalAddresses();
        if (addressesResponse.success) {
          setCryptoAddresses(addressesResponse.addresses);
          if (addressesResponse.addresses.length > 0) {
            setSelectedCryptoAddress(addressesResponse.addresses[0].id);
          }
        }
        
        // Get withdrawal fees and limits
        const feesResponse = await ApiService.getWithdrawalFees();
        if (feesResponse.success) {
          setWithdrawFee(feesResponse.fees.bank); // Default to bank fee
          setMinWithdrawalAmount(feesResponse.limits.min);
          setMaxWithdrawalAmount(feesResponse.limits.max);
        }
      } catch (error) {
        errorHandler.handleApiError(error);
      } finally {
        setInitialLoading(false);
      }
    };
    
    loadWithdrawalData();
    
    // Update user activity when screen is focused
    updateActivity();
  }, []);

  // Update withdrawal fee when method changes
  useEffect(() => {
    if (withdrawMethod === 'bank') {
      setWithdrawFee(2.5); // Example bank withdrawal fee
    } else {
      setWithdrawFee(0.0005); // Example crypto withdrawal fee
    }
  }, [withdrawMethod]);

  // Handle withdrawal method change
  const handleMethodChange = (method) => {
    setWithdrawMethod(method);
    setConfirmationStep(false);
  };

  // Calculate total amount including fee
  const calculateTotal = () => {
    const amount = parseFloat(withdrawAmount) || 0;
    return amount + withdrawFee;
  };

  // Validate withdrawal amount
  const validateAmount = () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!amount || isNaN(amount)) {
      Alert.alert(t('error'), t('withdraw_amount') + ' ' + t('required'));
      return false;
    }
    
    if (amount < minWithdrawalAmount) {
      Alert.alert(
        t('error'), 
        t('withdraw_min_amount', { amount: formatCurrency(minWithdrawalAmount) })
      );
      return false;
    }
    
    if (amount > maxWithdrawalAmount) {
      Alert.alert(
        t('error'), 
        t('withdraw_max_amount', { amount: formatCurrency(maxWithdrawalAmount) })
      );
      return false;
    }
    
    if (calculateTotal() > balance) {
      Alert.alert(t('error'), t('insufficient_balance'));
      return false;
    }
    
    return true;
  };

  // Proceed to confirmation step
  const proceedToConfirmation = () => {
    if (!validateAmount()) return;
    
    if (withdrawMethod === 'bank' && !selectedBankAccount) {
      Alert.alert(t('error'), t('withdraw_bank_account') + ' ' + t('required'));
      return;
    }
    
    if (withdrawMethod === 'crypto' && !selectedCryptoAddress) {
      Alert.alert(t('error'), t('withdraw_address') + ' ' + t('required'));
      return;
    }
    
    setConfirmationStep(true);
  };

  // Initiate withdrawal
  const initiateWithdrawal = async () => {
    if (user.twoFactorEnabled && !showTwoFactorInput) {
      setShowTwoFactorInput(true);
      return;
    }
    
    try {
      setLoading(true);
      
      let response;
      if (withdrawMethod === 'bank') {
        response = await ApiService.createWithdrawalRequest(
          parseFloat(withdrawAmount),
          selectedBankAccount,
          user.twoFactorEnabled ? twoFactorCode : null
        );
      } else {
        response = await ApiService.createCryptoWithdrawalRequest(
          parseFloat(withdrawAmount),
          selectedCryptoAddress,
          user.twoFactorEnabled ? twoFactorCode : null
        );
      }
      
      if (response.success) {
        Alert.alert(
          t('success'),
          t('withdraw_initiated'),
          [{ text: t('ok'), onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(t('error'), response.message || t('server_error'));
      }
    } catch (error) {
      errorHandler.handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  // Add new bank account
  const addBankAccount = () => {
    navigation.navigate('AddBankAccount', {
      onBankAccountAdded: (newAccount) => {
        setBankAccounts([...bankAccounts, newAccount]);
        setSelectedBankAccount(newAccount.id);
      }
    });
  };

  // Add new crypto address
  const addCryptoAddress = () => {
    navigation.navigate('AddWithdrawalAddress', {
      onAddressAdded: (newAddress) => {
        setCryptoAddresses([...cryptoAddresses, newAddress]);
        setSelectedCryptoAddress(newAddress.id);
      }
    });
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  // Find selected account/address for display
  const selectedBankAccountData = bankAccounts.find(account => account.id === selectedBankAccount);
  const selectedCryptoAddressData = cryptoAddresses.find(address => address.id === selectedCryptoAddress);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('withdraw_funds')}</Text>
        </View>
        
        {!confirmationStep ? (
          <View style={styles.formContainer}>
            <Card style={styles.balanceCard}>
              <View style={styles.balanceCardContent}>
                <Text style={styles.balanceLabel}>{t('available_balance')}</Text>
                <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
              </View>
            </Card>
            
            <View style={styles.methodSelector}>
              <Text style={styles.sectionTitle}>{t('withdraw_method')}</Text>
              <View style={styles.methodButtons}>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    withdrawMethod === 'bank' && styles.methodButtonActive
                  ]}
                  onPress={() => handleMethodChange('bank')}
                >
                  <Ionicons
                    name="card"
                    size={24}
                    color={withdrawMethod === 'bank' ? '#fff' : '#616161'}
                    style={styles.methodIcon}
                  />
                  <Text 
                    style={[
                      styles.methodText,
                      withdrawMethod === 'bank' && styles.methodTextActive
                    ]}
                  >
                    {t('bank_transfer')}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    withdrawMethod === 'crypto' && styles.methodButtonActive
                  ]}
                  onPress={() => handleMethodChange('crypto')}
                >
                  <Ionicons
                    name="logo-bitcoin"
                    size={24}
                    color={withdrawMethod === 'crypto' ? '#fff' : '#616161'}
                    style={styles.methodIcon}
                  />
                  <Text 
                    style={[
                      styles.methodText,
                      withdrawMethod === 'crypto' && styles.methodTextActive
                    ]}
                  >
                    {t('crypto_deposit')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <Card style={styles.inputCard}>
              <View style={styles.inputCardContent}>
                <Text style={styles.inputLabel}>{t('withdraw_amount')}</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>€</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={withdrawAmount}
                    onChangeText={setWithdrawAmount}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                </View>
                
                <View style={styles.limitsContainer}>
                  <Text style={styles.limitText}>
                    {t('withdraw_min_amount', { amount: formatCurrency(minWithdrawalAmount) })}
                  </Text>
                  <Text style={styles.limitText}>
                    {t('withdraw_max_amount', { amount: formatCurrency(maxWithdrawalAmount) })}
                  </Text>
                </View>
                
                <View style={styles.feeContainer}>
                  <Text style={styles.feeLabel}>{t('withdraw_fee')}</Text>
                  <Text style={styles.feeValue}>{formatCurrency(withdrawFee)}</Text>
                </View>
                
                <Divider style={styles.divider} />
                
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>{t('withdraw_total')}</Text>
                  <Text style={styles.totalValue}>{formatCurrency(calculateTotal())}</Text>
                </View>
              </View>
            </Card>
            
            {withdrawMethod === 'bank' && (
              <Card style={styles.destinationCard}>
                <View style={styles.destinationCardContent}>
                  <View style={styles.destinationHeader}>
                    <Text style={styles.destinationTitle}>{t('withdraw_bank_account')}</Text>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={addBankAccount}
                    >
                      <Ionicons name="add" size={20} color="#6200ee" />
                      <Text style={styles.addButtonText}>{t('add_bank_account')}</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {bankAccounts.length > 0 ? (
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={selectedBankAccount}
                        onValueChange={(itemValue) => setSelectedBankAccount(itemValue)}
                        style={styles.picker}
                      >
                        {bankAccounts.map(account => (
                          <Picker.Item
                            key={account.id}
                            label={`${account.bankName} - ${account.accountNumber.slice(-4)}`}
                            value={account.id}
                          />
                        ))}
                      </Picker>
                    </View>
                  ) : (
                    <Text style={styles.noAccountsText}>
                      {t('no_bank_accounts')}
                    </Text>
                  )}
                  
                  {selectedBankAccountData && (
                    <View style={styles.selectedAccountInfo}>
                      <Text style={styles.accountInfoItem}>
                        <Text style={styles.accountInfoLabel}>{t('bank_name')}: </Text>
                        {selectedBankAccountData.bankName}
                      </Text>
                      <Text style={styles.accountInfoItem}>
                        <Text style={styles.accountInfoLabel}>{t('account_holder')}: </Text>
                        {selectedBankAccountData.accountHolder}
                      </Text>
                      <Text style={styles.accountInfoItem}>
                        <Text style={styles.accountInfoLabel}>{t('account_number')}: </Text>
                        {selectedBankAccountData.accountNumber}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            )}
            
            {withdrawMethod === 'crypto' && (
              <Card style={styles.destinationCard}>
                <View style={styles.destinationCardContent}>
                  <View style={styles.destinationHeader}>
                    <Text style={styles.destinationTitle}>{t('withdraw_address')}</Text>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={addCryptoAddress}
                    >
                      <Ionicons name="add" size={20} color="#6200ee" />
                      <Text style={styles.addButtonText}>{t('add_withdrawal_address')}</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {cryptoAddresses.length > 0 ? (
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={selectedCryptoAddress}
                        onValueChange={(itemValue) => setSelectedCryptoAddress(itemValue)}
                        style={styles.picker}
                      >
                        {cryptoAddresses.map(address => (
                          <Picker.Item
                            key={address.id}
                            label={`${address.label} (${address.currency})`}
                            value={address.id}
                          />
                        ))}
                      </Picker>
                    </View>
                  ) : (
                    <Text style={styles.noAccountsText}>
                      {t('no_withdrawal_addresses')}
                    </Text>
                  )}
                  
                  {selectedCryptoAddressData && (
                    <View style={styles.selectedAccountInfo}>
                      <Text style={styles.accountInfoItem}>
                        <Text style={styles.accountInfoLabel}>{t('label')}: </Text>
                        {selectedCryptoAddressData.label}
                      </Text>
                      <Text style={styles.accountInfoItem}>
                        <Text style={styles.accountInfoLabel}>{t('currency')}: </Text>
                        {selectedCryptoAddressData.currency}
                      </Text>
                      <Text style={styles.accountInfoItem}>
                        <Text style={styles.accountInfoLabel}>{t('address')}: </Text>
                        {selectedCryptoAddressData.address.substring(0, 10)}...
                        {selectedCryptoAddressData.address.substring(selectedCryptoAddressData.address.length - 10)}
                      </Text>
                    </View>
                  )}
                </View>
              </Card>
            )}
            
            <TouchableOpacity
              style={styles.continueButton}
              onPress={proceedToConfirmation}
              disabled={
                !withdrawAmount ||
                (withdrawMethod === 'bank' && !selectedBankAccount) ||
                (withdrawMethod === 'crypto' && !selectedCryptoAddress)
              }
            >
              <Text style={styles.continueButtonText}>{t('withdraw_review')}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.continueButtonIcon} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.confirmationContainer}>
            <Text style={styles.confirmationTitle}>{t('withdraw_confirm')}</Text>
            
            <Card style={styles.confirmationCard}>
              <View style={styles.confirmationCardContent}>
                <View style={styles.confirmationItem}>
                  <Text style={styles.confirmationLabel}>{t('withdraw_method')}</Text>
                  <Text style={styles.confirmationValue}>
                    {withdrawMethod === 'bank' ? t('bank_transfer') : t('crypto_deposit')}
                  </Text>
                </View>
                
                <View style={styles.confirmationItem}>
                  <Text style={styles.confirmationLabel}>{t('withdraw_amount')}</Text>
                  <Text style={styles.confirmationValue}>{formatCurrency(parseFloat(withdrawAmount))}</Text>
                </View>
                
                <View style={styles.confirmationItem}>
                  <Text style={styles.confirmationLabel}>{t('withdraw_fee')}</Text>
                  <Text style={styles.confirmationValue}>{formatCurrency(withdrawFee)}</Text>
                </View>
                
                <View style={styles.confirmationItem}>
                  <Text style={styles.confirmationLabel}>{t('withdraw_total')}</Text>
                  <Text style={styles.confirmationValueTotal}>{formatCurrency(calculateTotal())}</Text>
                </View>
                
                <Divider style={styles.divider} />
                
                <View style={styles.confirmationItem}>
                  <Text style={styles.confirmationLabel}>
                    {withdrawMethod === 'bank' ? t('withdraw_bank_account') : t('withdraw_address')}
                  </Text>
                  <Text style={styles.confirmationValue}>
                    {withdrawMethod === 'bank' 
                      ? `${selectedBankAccountData?.bankName} - ${selectedBankAccountData?.accountNumber.slice(-4)}` 
                      : `${selectedCryptoAddressData?.label} (${selectedCryptoAddressData?.currency})`
                    }
                  </Text>
                </View>
              </View>
            </Card>
            
            {showTwoFactorInput && (
              <Card style={styles.twoFactorCard}>
                <View style={styles.twoFactorCardContent}>
                  <Text style={styles.twoFactorTitle}>{t('withdraw_verification')}</Text>
                  <Text style={styles.twoFactorDescription}>{t('withdraw_code_sent')}</Text>
                  
                  <TextInput
                    style={styles.twoFactorInput}
                    value={twoFactorCode}
                    onChangeText={setTwoFactorCode}
                    placeholder={t('withdraw_confirmation_code')}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </Card>
            )}
            
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setConfirmationStep(false);
                  setShowTwoFactorInput(false);
                  setTwoFactorCode('');
                }}
              >
                <Ionicons name="arrow-back" size={20} color="#6200ee" style={styles.backButtonIcon} />
                <Text style={styles.backButtonText}>{t('back')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={initiateWithdrawal}
                disabled={loading || (showTwoFactorInput && (!twoFactorCode || twoFactorCode.length !== 6))}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.confirmButtonText}>{t('confirm')}</Text>
                    <Ionicons name="checkmark" size={20} color="#fff" style={styles.confirmButtonIcon} />
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            <Card style={styles.warningCard}>
              <View style={styles.warningCardContent}>
                <Ionicons name="warning" size={24} color="#ff9800" style={styles.warningIcon} />
                <Text style={styles.warningText}>
                  {withdrawMethod === 'bank'
                    ? t('bank_withdrawal_warning')
                    : t('crypto_withdrawal_warning')
                  }
                </Text>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  formContainer: {
    padding: 16,
  },
  balanceCard: {
    marginBottom: 16,
    borderRadius: 8,
  },
  balanceCardContent: {
    padding: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#757575',
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  methodSelector: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  methodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  methodButtonActive: {
    backgroundColor: '#6200ee',
  },
  methodIcon: {
    marginRight: 8,
  },
  methodText: {
    fontSize: 14,
    color: '#616161',
  },
  methodTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  inputCard: {
    marginBottom: 16,
    borderRadius: 8,
  },
  inputCardContent: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 20,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    height: 48,
    fontSize: 18,
  },
  limitsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  limitText: {
    fontSize: 12,
    color: '#757575',
  },
  feeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  feeLabel: {
    fontSize: 14,
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    marginVertical: 12,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  destinationCard: {
    marginBottom: 16,
    borderRadius: 8,
  },
  destinationCardContent: {
    padding: 16,
  },
  destinationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  destinationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#6200ee',
    marginLeft: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 48,
    width: '100%',
  },
  noAccountsText: {
    textAlign: 'center',
    color: '#757575',
    marginBottom: 12,
  },
  selectedAccountInfo: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  accountInfoItem: {
    marginBottom: 4,
  },
  accountInfoLabel: {
    fontWeight: 'bold',
  },
  continueButton: {
    backgroundColor: '#6200ee',
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  continueButtonIcon: {
    marginLeft: 8,
  },
  confirmationContainer: {
    padding: 16,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  confirmationCard: {
    marginBottom: 16,
    borderRadius: 8,
  },
  confirmationCardContent: {
    padding: 16,
  },
  confirmationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  confirmationLabel: {
    fontSize: 14,
    color: '#757575',
  },
  confirmationValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  confirmationValueTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  twoFactorCard: {
    marginBottom: 16,
    borderRadius: 8,
  },
  twoFactorCardContent: {
    padding: 16,
    alignItems: 'center',
  },
  twoFactorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  twoFactorDescription: {
    color: '#757575',
    marginBottom: 16,
    textAlign: 'center',
  },
  twoFactorInput: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 8,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6200ee',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    marginRight: 8,
  },
  backButtonText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  backButtonIcon: {
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#6200ee',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  confirmButtonIcon: {
    marginLeft: 8,
  },
  warningCard: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  warningCardContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#6d4c41',
  },
});

export default WithdrawScreen;