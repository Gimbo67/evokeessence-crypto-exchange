import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

// Main screens
import HomeScreen from '../screens/main/HomeScreen';
import MarketsScreen from '../screens/main/MarketsScreen';
import WalletScreen from '../screens/main/WalletScreen';
import TradeScreen from '../screens/main/TradeScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import VerificationScreen from '../screens/main/VerificationScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ContractorDashboardScreen from '../screens/contractor/ContractorDashboardScreen';
import BiometricSettingsScreen from '../screens/security/BiometricSettingsScreen';
import NotificationSettingsScreen from '../screens/security/NotificationSettingsScreen';
import TwoFactorAuthScreen from '../screens/security/TwoFactorAuthScreen';
import BuyCryptoScreen from '../screens/main/BuyCryptoScreen';

const Tab = createBottomTabNavigator();
const ProfileStack = createNativeStackNavigator();
const WalletStack = createNativeStackNavigator();
const MarketsStack = createNativeStackNavigator();

// Profile Tab Navigator with nested screens
const ProfileStackNavigator = () => {
  const { user } = useAuth();
  
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="Verification" component={VerificationScreen} />
      <ProfileStack.Screen name="BiometricSettings" component={BiometricSettingsScreen} />
      <ProfileStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <ProfileStack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreen} />
      
      {/* Conditionally include admin/contractor screens based on user role */}
      {user?.isAdmin && (
        <ProfileStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      )}
      
      {user?.isContractor && (
        <ProfileStack.Screen name="ContractorDashboard" component={ContractorDashboardScreen} />
      )}
    </ProfileStack.Navigator>
  );
};

// Wallet Tab Navigator with nested screens
const WalletStackNavigator = () => (
  <WalletStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <WalletStack.Screen name="WalletMain" component={WalletScreen} />
    <WalletStack.Screen name="BuyCrypto" component={BuyCryptoScreen} />
  </WalletStack.Navigator>
);

// Markets Tab Navigator with nested screens
const MarketsStackNavigator = () => (
  <MarketsStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <MarketsStack.Screen name="MarketsMain" component={MarketsScreen} />
    <MarketsStack.Screen name="BuyCrypto" component={BuyCryptoScreen} />
    <MarketsStack.Screen name="Trade" component={TradeScreen} />
  </MarketsStack.Navigator>
);

// Main Tab Navigator
const MainTabNavigator = () => {
  const { user } = useAuth();
  
  // For showing badges on tabs based on verification status or other notifications
  const getVerificationBadge = () => {
    if (user?.verificationStatus === 'pending' || user?.verificationStatus === 'requested') {
      return '!';
    }
    return undefined;
  };
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Markets') {
            iconName = focused ? 'trending-up' : 'trending-up-outline';
          } else if (route.name === 'Wallet') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Trade') {
            iconName = focused ? 'swap-horizontal' : 'swap-horizontal-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0066CC',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      
      <Tab.Screen name="Markets" component={MarketsStackNavigator} />
      
      <Tab.Screen 
        name="Wallet" 
        component={WalletStackNavigator}
      />
      
      <Tab.Screen 
        name="Trade" 
        component={TradeScreen}
      />
      
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator}
        options={{ 
          tabBarBadge: getVerificationBadge()
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;