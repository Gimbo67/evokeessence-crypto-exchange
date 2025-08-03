import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/apiClient';

const ProfileScreen = () => {
  const { user, refreshUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    countryOfResidence: '',
    gender: ''
  });

  // Load user profile data
  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.full_name || '',
        email: user.email || '',
        phoneNumber: user.phone_number || '',
        address: user.address || '',
        countryOfResidence: user.country_of_residence || '',
        gender: user.gender || ''
      });
    }
  }, [user]);

  // Handle profile update
  const handleUpdate = async () => {
    if (!editMode) {
      setEditMode(true);
      return;
    }

    // Basic validation
    if (!profileData.fullName || !profileData.email) {
      Alert.alert('Error', 'Name and email are required fields');
      return;
    }

    setSaving(true);
    try {
      await apiClient.user.updateProfile(profileData);
      await refreshUser();
      setEditMode(false);
      Alert.alert('Success', 'Your profile has been updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancel = () => {
    // Reset to original values
    if (user) {
      setProfileData({
        fullName: user.full_name || '',
        email: user.email || '',
        phoneNumber: user.phone_number || '',
        address: user.address || '',
        countryOfResidence: user.country_of_residence || '',
        gender: user.gender || ''
      });
    }
    setEditMode(false);
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.username ? user.username.substring(0, 2).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.username}>{user?.username || 'User'}</Text>
          <Text style={styles.userRole}>
            {user?.is_admin || user?.isAdmin
              ? 'Administrator'
              : user?.is_contractor || user?.isContractor
              ? 'Contractor'
              : user?.is_employee || user?.isEmployee
              ? 'Employee'
              : 'Client'}
          </Text>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account Details</Text>

          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Full Name</Text>
            {editMode ? (
              <TextInput
                style={styles.profileInput}
                value={profileData.fullName}
                onChangeText={(text) => setProfileData({ ...profileData, fullName: text })}
                placeholder="Enter your full name"
              />
            ) : (
              <Text style={styles.profileValue}>{profileData.fullName || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Email</Text>
            {editMode ? (
              <TextInput
                style={styles.profileInput}
                value={profileData.email}
                onChangeText={(text) => setProfileData({ ...profileData, email: text })}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.profileValue}>{profileData.email || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Phone Number</Text>
            {editMode ? (
              <TextInput
                style={styles.profileInput}
                value={profileData.phoneNumber}
                onChangeText={(text) => setProfileData({ ...profileData, phoneNumber: text })}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.profileValue}>{profileData.phoneNumber || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Address</Text>
            {editMode ? (
              <TextInput
                style={styles.profileInput}
                value={profileData.address}
                onChangeText={(text) => setProfileData({ ...profileData, address: text })}
                placeholder="Enter your address"
              />
            ) : (
              <Text style={styles.profileValue}>{profileData.address || 'Not provided'}</Text>
            )}
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Country</Text>
            {editMode ? (
              <TextInput
                style={styles.profileInput}
                value={profileData.countryOfResidence}
                onChangeText={(text) => setProfileData({ ...profileData, countryOfResidence: text })}
                placeholder="Enter your country"
              />
            ) : (
              <Text style={styles.profileValue}>
                {profileData.countryOfResidence || 'Not provided'}
              </Text>
            )}
          </View>

          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>Gender</Text>
            {editMode ? (
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    profileData.gender === 'male' && styles.genderOptionSelected
                  ]}
                  onPress={() => setProfileData({ ...profileData, gender: 'male' })}
                >
                  <Text
                    style={[
                      styles.genderText,
                      profileData.gender === 'male' && styles.genderTextSelected
                    ]}
                  >
                    Male
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    profileData.gender === 'female' && styles.genderOptionSelected
                  ]}
                  onPress={() => setProfileData({ ...profileData, gender: 'female' })}
                >
                  <Text
                    style={[
                      styles.genderText,
                      profileData.gender === 'female' && styles.genderTextSelected
                    ]}
                  >
                    Female
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    profileData.gender === 'other' && styles.genderOptionSelected
                  ]}
                  onPress={() => setProfileData({ ...profileData, gender: 'other' })}
                >
                  <Text
                    style={[
                      styles.genderText,
                      profileData.gender === 'other' && styles.genderTextSelected
                    ]}
                  >
                    Other
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.profileValue}>
                {profileData.gender
                  ? profileData.gender.charAt(0).toUpperCase() + profileData.gender.slice(1)
                  : 'Not provided'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account Status</Text>

          <View style={styles.profileItem}>
            <Text style={styles.profileLabel}>KYC Status</Text>
            <Text
              style={[
                styles.profileValue,
                styles.kycStatus,
                (user?.kycStatus === 'approved' || user?.kyc_status === 'approved') &&
                  styles.verifiedStatus
              ]}
            >
              {user?.kycStatus || user?.kyc_status || 'Not Started'}
            </Text>
          </View>

          {(user?.is_contractor || user?.isContractor) && (
            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Referral Code</Text>
              <Text style={styles.profileValue}>{user?.referral_code || 'None'}</Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          {editMode ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.updateButton]}
                onPress={handleUpdate}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.updateButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.updateButton]}
              onPress={handleUpdate}
            >
              <Text style={styles.updateButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.button, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  profileItem: {
    marginBottom: 16,
  },
  profileLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  profileValue: {
    fontSize: 16,
    color: '#333',
  },
  profileInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  kycStatus: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  verifiedStatus: {
    color: '#4caf50',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  genderOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  genderOptionSelected: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  genderText: {
    color: '#333',
  },
  genderTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 20,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  updateButton: {
    backgroundColor: '#6200ee',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#f44336',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;