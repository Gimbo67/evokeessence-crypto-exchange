import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/apiClient';

const DepositsScreen = () => {
  const { user, refreshUser } = useAuth();
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [newDepositData, setNewDepositData] = useState({
    amount: '',
    currency: 'USD',
    method: 'bank_transfer'
  });
  const [creatingDeposit, setCreatingDeposit] = useState(false);

  // Format currency amount
  const formatCurrency = (amount, currency = 'USD') => {
    return `${parseFloat(amount).toFixed(2)} ${currency}`;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Load deposits
  const loadDeposits = async () => {
    try {
      const data = await apiClient.deposits.getDeposits();
      setDeposits(data);
      setError(null);
    } catch (error) {
      console.error('Error loading deposits:', error);
      setError('Failed to load deposits. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadDeposits();
  };

  // Load initial data
  useEffect(() => {
    loadDeposits();
  }, []);

  // Handle deposit creation
  const handleCreateDeposit = async () => {
    // Validate input
    if (!newDepositData.amount || isNaN(parseFloat(newDepositData.amount)) || parseFloat(newDepositData.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setCreatingDeposit(true);
    try {
      const createdDeposit = await apiClient.deposits.createDeposit(newDepositData);
      setDeposits([createdDeposit, ...deposits]);
      setIsCreateModalVisible(false);
      setNewDepositData({
        amount: '',
        currency: 'USD',
        method: 'bank_transfer'
      });
      Alert.alert('Success', 'Deposit request created successfully');
      
      // Refresh user data to update balance
      await refreshUser();
    } catch (error) {
      console.error('Error creating deposit:', error);
      Alert.alert('Error', 'Failed to create deposit. Please try again.');
    } finally {
      setCreatingDeposit(false);
    }
  };

  // Handle deposit detail view
  const handleViewDeposit = async (deposit) => {
    setSelectedDeposit(deposit);
    
    try {
      // Get detailed deposit information if available
      const depositDetails = await apiClient.deposits.getDepositDetails(deposit.id);
      setSelectedDeposit(depositDetails);
    } catch (error) {
      console.error('Error loading deposit details:', error);
      // Continue with the basic deposit info we already have
    }
    
    setIsDetailModalVisible(true);
  };

  // Render a deposit item
  const renderDepositItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.depositItem}
      onPress={() => handleViewDeposit(item)}
    >
      <View style={styles.depositInfo}>
        <Text style={styles.depositAmount}>
          {formatCurrency(item.amount, item.currency)}
        </Text>
        <Text style={styles.depositMethod}>
          Method: {item.method.replace('_', ' ').toUpperCase()}
        </Text>
      </View>
      <View style={styles.depositStatus}>
        <Text style={[
          styles.statusText,
          item.status === 'completed' ? styles.completedStatus :
          item.status === 'pending' ? styles.pendingStatus : 
          item.status === 'failed' ? styles.failedStatus : 
          styles.processingStatus
        ]}>
          {item.status.toUpperCase()}
        </Text>
        <Text style={styles.depositDate}>
          {formatDate(item.created_at)}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Deposits</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => setIsCreateModalVisible(true)}
        >
          <Text style={styles.createButtonText}>+ New Deposit</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading deposits...</Text>
        </View>
      ) : (
        <FlatList
          data={deposits}
          renderItem={renderDepositItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No deposits found</Text>
              <Text style={styles.emptySubText}>
                Create a new deposit to fund your account
              </Text>
            </View>
          }
        />
      )}

      {/* Create Deposit Modal */}
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Deposit</Text>
              <TouchableOpacity
                onPress={() => setIsCreateModalVisible(false)}
                disabled={creatingDeposit}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Amount</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter amount"
                  value={newDepositData.amount}
                  onChangeText={(text) => setNewDepositData({...newDepositData, amount: text})}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Currency</Text>
                <View style={styles.selectContainer}>
                  <TouchableOpacity
                    style={[
                      styles.selectOption,
                      newDepositData.currency === 'USD' && styles.selectOptionActive
                    ]}
                    onPress={() => setNewDepositData({...newDepositData, currency: 'USD'})}
                  >
                    <Text style={[
                      styles.selectOptionText,
                      newDepositData.currency === 'USD' && styles.selectOptionTextActive
                    ]}>USD</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.selectOption,
                      newDepositData.currency === 'EUR' && styles.selectOptionActive
                    ]}
                    onPress={() => setNewDepositData({...newDepositData, currency: 'EUR'})}
                  >
                    <Text style={[
                      styles.selectOptionText,
                      newDepositData.currency === 'EUR' && styles.selectOptionTextActive
                    ]}>EUR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.selectOption,
                      newDepositData.currency === 'GBP' && styles.selectOptionActive
                    ]}
                    onPress={() => setNewDepositData({...newDepositData, currency: 'GBP'})}
                  >
                    <Text style={[
                      styles.selectOptionText,
                      newDepositData.currency === 'GBP' && styles.selectOptionTextActive
                    ]}>GBP</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.methodContainer}>
                  <TouchableOpacity
                    style={[
                      styles.methodOption,
                      newDepositData.method === 'bank_transfer' && styles.methodOptionActive
                    ]}
                    onPress={() => setNewDepositData({...newDepositData, method: 'bank_transfer'})}
                  >
                    <Ionicons
                      name="card-outline"
                      size={24}
                      color={newDepositData.method === 'bank_transfer' ? '#6200ee' : '#666'}
                    />
                    <Text style={[
                      styles.methodOptionText,
                      newDepositData.method === 'bank_transfer' && styles.methodOptionTextActive
                    ]}>Bank Transfer</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.methodOption,
                      newDepositData.method === 'credit_card' && styles.methodOptionActive
                    ]}
                    onPress={() => setNewDepositData({...newDepositData, method: 'credit_card'})}
                  >
                    <Ionicons
                      name="card-outline"
                      size={24}
                      color={newDepositData.method === 'credit_card' ? '#6200ee' : '#666'}
                    />
                    <Text style={[
                      styles.methodOptionText,
                      newDepositData.method === 'credit_card' && styles.methodOptionTextActive
                    ]}>Credit Card</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.methodOption,
                      newDepositData.method === 'crypto' && styles.methodOptionActive
                    ]}
                    onPress={() => setNewDepositData({...newDepositData, method: 'crypto'})}
                  >
                    <Ionicons
                      name="logo-bitcoin"
                      size={24}
                      color={newDepositData.method === 'crypto' ? '#6200ee' : '#666'}
                    />
                    <Text style={[
                      styles.methodOptionText,
                      newDepositData.method === 'crypto' && styles.methodOptionTextActive
                    ]}>Cryptocurrency</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.createDepositButton}
                onPress={handleCreateDeposit}
                disabled={creatingDeposit}
              >
                {creatingDeposit ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.createDepositButtonText}>Create Deposit</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Deposit Detail Modal */}
      <Modal
        visible={isDetailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deposit Details</Text>
              <TouchableOpacity onPress={() => setIsDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedDeposit && (
              <ScrollView contentContainerStyle={styles.detailScrollContent}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Deposit ID</Text>
                  <Text style={styles.detailValue}>{selectedDeposit.id}</Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.detailValue}>
                    {formatCurrency(selectedDeposit.amount, selectedDeposit.currency)}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[
                    styles.detailValue,
                    styles.statusText,
                    selectedDeposit.status === 'completed' ? styles.completedStatus :
                    selectedDeposit.status === 'pending' ? styles.pendingStatus : 
                    selectedDeposit.status === 'failed' ? styles.failedStatus : 
                    styles.processingStatus
                  ]}>
                    {selectedDeposit.status.toUpperCase()}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Payment Method</Text>
                  <Text style={styles.detailValue}>
                    {selectedDeposit.method.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
                
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Created Date</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedDeposit.created_at)}
                  </Text>
                </View>
                
                {selectedDeposit.completed_at && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Completed Date</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(selectedDeposit.completed_at)}
                    </Text>
                  </View>
                )}
                
                {selectedDeposit.transaction_id && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Transaction ID</Text>
                    <Text style={styles.detailValue}>{selectedDeposit.transaction_id}</Text>
                  </View>
                )}
                
                {selectedDeposit.notes && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.detailValue}>{selectedDeposit.notes}</Text>
                  </View>
                )}
                
                {selectedDeposit.status === 'pending' && (
                  <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsTitle}>Payment Instructions</Text>
                    <Text style={styles.instructionsText}>
                      Please complete your payment using the provided details below.
                      Your deposit will be processed once payment is confirmed.
                    </Text>
                    
                    {selectedDeposit.method === 'bank_transfer' && (
                      <View style={styles.bankDetails}>
                        <Text style={styles.bankDetailItem}>
                          <Text style={styles.bankDetailLabel}>Bank Name:</Text> Evo Bank
                        </Text>
                        <Text style={styles.bankDetailItem}>
                          <Text style={styles.bankDetailLabel}>Account Name:</Text> EvokeEssence s.r.o.
                        </Text>
                        <Text style={styles.bankDetailItem}>
                          <Text style={styles.bankDetailLabel}>IBAN:</Text> CZ7508000000001234567890
                        </Text>
                        <Text style={styles.bankDetailItem}>
                          <Text style={styles.bankDetailLabel}>SWIFT/BIC:</Text> EVOCZCZP
                        </Text>
                        <Text style={styles.bankDetailItem}>
                          <Text style={styles.bankDetailLabel}>Reference:</Text> DEP-{selectedDeposit.id}
                        </Text>
                      </View>
                    )}
                    
                    {selectedDeposit.method === 'crypto' && (
                      <View style={styles.cryptoDetails}>
                        <Text style={styles.cryptoDetailItem}>
                          <Text style={styles.cryptoDetailLabel}>BTC Address:</Text>
                        </Text>
                        <Text style={styles.cryptoAddress}>3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5</Text>
                        <Text style={styles.cryptoDetailItem}>
                          <Text style={styles.cryptoDetailLabel}>Reference/Memo:</Text> DEP-{selectedDeposit.id}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                
                {selectedDeposit.status === 'failed' && (
                  <View style={styles.failureContainer}>
                    <Text style={styles.failureTitle}>Failure Reason</Text>
                    <Text style={styles.failureText}>
                      {selectedDeposit.failure_reason || 'Your deposit could not be processed. Please try again or contact support.'}
                    </Text>
                  </View>
                )}
                
                <TouchableOpacity
                  style={styles.closeDetailButton}
                  onPress={() => setIsDetailModalVisible(false)}
                >
                  <Text style={styles.closeDetailButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 16,
  },
  depositItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  depositInfo: {
    flex: 1,
  },
  depositAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  depositMethod: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  depositStatus: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pendingStatus: {
    backgroundColor: '#fff8e1',
    color: '#ff8f00',
  },
  completedStatus: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
  },
  processingStatus: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
  },
  failedStatus: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  depositDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalScrollContent: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  selectContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
    borderRadius: 8,
  },
  selectOptionActive: {
    backgroundColor: '#6200ee',
  },
  selectOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectOptionTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  methodContainer: {
    marginTop: 8,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  methodOptionActive: {
    borderColor: '#6200ee',
    backgroundColor: '#f5f0ff',
  },
  methodOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  methodOptionTextActive: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  createDepositButton: {
    backgroundColor: '#6200ee',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  createDepositButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailScrollContent: {
    padding: 16,
  },
  detailItem: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  instructionsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  bankDetails: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  bankDetailItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  bankDetailLabel: {
    fontWeight: 'bold',
  },
  cryptoDetails: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cryptoDetailItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  cryptoDetailLabel: {
    fontWeight: 'bold',
  },
  cryptoAddress: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  failureContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  failureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 8,
  },
  failureText: {
    fontSize: 14,
    color: '#333',
  },
  closeDetailButton: {
    backgroundColor: '#6200ee',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  closeDetailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DepositsScreen;