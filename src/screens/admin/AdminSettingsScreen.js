import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AdminSettingsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    commissionRate: 0.12, // 12% default
    minimumWithdrawal: 50,
    maintenanceMode: false,
    enableTwoFactor: true,
    registrationOpen: true,
    maxLoginAttempts: 5,
    notificationSettings: {
      emailNotifications: true,
      pushNotifications: true
    }
  });

  // Fetch settings
  const fetchSettings = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${API_URL}/api/admin/settings`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data && response.data.success) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      Alert.alert('Error', 'Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save settings
  const saveSettings = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.put(
        `${API_URL}/api/admin/settings`,
        { settings },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data && response.data.success) {
        Alert.alert('Success', 'Settings updated successfully');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [key]: value
    }));
  };

  const updateNestedSetting = (parent, key, value) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [parent]: {
        ...prevSettings[parent],
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Settings</Text>
      </View>

      <Card style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>Contractor Program</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>Commission Rate (%)</Text>
            <Text style={styles.settingDescription}>
              Percentage of deposit amount paid to contractors
            </Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.numberInput}
              value={settings.commissionRate ? (settings.commissionRate * 100).toString() : '12'}
              onChangeText={(text) => {
                const value = parseFloat(text);
                if (!isNaN(value)) {
                  updateSetting('commissionRate', value / 100);
                }
              }}
              keyboardType="numeric"
            />
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>Minimum Withdrawal (€)</Text>
            <Text style={styles.settingDescription}>
              Minimum amount required for withdrawal
            </Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.numberInput}
              value={settings.minimumWithdrawal ? settings.minimumWithdrawal.toString() : '50'}
              onChangeText={(text) => {
                const value = parseFloat(text);
                if (!isNaN(value)) {
                  updateSetting('minimumWithdrawal', value);
                }
              }}
              keyboardType="numeric"
            />
          </View>
        </View>
      </Card>

      <Card style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>System Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>Maintenance Mode</Text>
            <Text style={styles.settingDescription}>
              Put the system in maintenance mode
            </Text>
          </View>
          <Switch
            value={settings.maintenanceMode}
            onValueChange={(value) => updateSetting('maintenanceMode', value)}
            trackColor={{ false: '#e0e0e0', true: '#ba86fc' }}
            thumbColor={settings.maintenanceMode ? '#6200ee' : '#f5f5f5'}
          />
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>Two-Factor Authentication</Text>
            <Text style={styles.settingDescription}>
              Require 2FA for all users
            </Text>
          </View>
          <Switch
            value={settings.enableTwoFactor}
            onValueChange={(value) => updateSetting('enableTwoFactor', value)}
            trackColor={{ false: '#e0e0e0', true: '#ba86fc' }}
            thumbColor={settings.enableTwoFactor ? '#6200ee' : '#f5f5f5'}
          />
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>Open Registration</Text>
            <Text style={styles.settingDescription}>
              Allow new user registrations
            </Text>
          </View>
          <Switch
            value={settings.registrationOpen}
            onValueChange={(value) => updateSetting('registrationOpen', value)}
            trackColor={{ false: '#e0e0e0', true: '#ba86fc' }}
            thumbColor={settings.registrationOpen ? '#6200ee' : '#f5f5f5'}
          />
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>Max Login Attempts</Text>
            <Text style={styles.settingDescription}>
              Maximum failed login attempts before temporary lockout
            </Text>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.numberInput}
              value={settings.maxLoginAttempts ? settings.maxLoginAttempts.toString() : '5'}
              onChangeText={(text) => {
                const value = parseInt(text);
                if (!isNaN(value)) {
                  updateSetting('maxLoginAttempts', value);
                }
              }}
              keyboardType="numeric"
            />
          </View>
        </View>
      </Card>

      <Card style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>Notification Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>Email Notifications</Text>
            <Text style={styles.settingDescription}>
              Send system notifications via email
            </Text>
          </View>
          <Switch
            value={settings.notificationSettings?.emailNotifications}
            onValueChange={(value) => 
              updateNestedSetting('notificationSettings', 'emailNotifications', value)
            }
            trackColor={{ false: '#e0e0e0', true: '#ba86fc' }}
            thumbColor={settings.notificationSettings?.emailNotifications ? '#6200ee' : '#f5f5f5'}
          />
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.settingItem}>
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Text style={styles.settingDescription}>
              Enable push notifications for mobile devices
            </Text>
          </View>
          <Switch
            value={settings.notificationSettings?.pushNotifications}
            onValueChange={(value) => 
              updateNestedSetting('notificationSettings', 'pushNotifications', value)
            }
            trackColor={{ false: '#e0e0e0', true: '#ba86fc' }}
            thumbColor={settings.notificationSettings?.pushNotifications ? '#6200ee' : '#f5f5f5'}
          />
        </View>
      </Card>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]}
          onPress={() => fetchSettings()}
        >
          <Text style={styles.cancelButtonText}>Reset</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.saveButton]}
          onPress={saveSettings}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.dangerButton}>
        <Ionicons name="trash" size={20} color="#fff" />
        <Text style={styles.dangerButtonText}>Clear All Cache</Text>
      </TouchableOpacity>
    </ScrollView>
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
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  settingsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    width: 80,
  },
  numberInput: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 4,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#6200ee',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#616161',
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: '#f44336',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 12,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default AdminSettingsScreen;