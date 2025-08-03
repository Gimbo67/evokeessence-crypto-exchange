import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import TwoFactorScreen from '../screens/auth/TwoFactorScreen';

// Dashboard screens
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import MarketsScreen from '../screens/dashboard/MarketsScreen';
import DepositsScreen from '../screens/dashboard/DepositsScreen';
import ProfileScreen from '../screens/dashboard/ProfileScreen';

// Admin screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import AdminAnalyticsScreen from '../screens/admin/AdminAnalyticsScreen';

// Contractor screens
import ContractorDashboardScreen from '../screens/contractor/ContractorDashboardScreen';
import ContractorReferralsScreen from '../screens/contractor/ContractorReferralsScreen';
import ContractorAnalyticsScreen from '../screens/contractor/ContractorAnalyticsScreen';

// Create navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Navigator
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="TwoFactor" component={TwoFactorScreen} />
  </Stack.Navigator>
);

// Main tab navigator for regular users
const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Dashboard') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Markets') {
          iconName = focused ? 'stats-chart' : 'stats-chart-outline';
        } else if (route.name === 'Deposits') {
          iconName = focused ? 'cash' : 'cash-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#6200ee',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Markets" component={MarketsScreen} />
    <Tab.Screen name="Deposits" component={DepositsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// Admin tab navigator
const AdminTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'AdminHome') {
          iconName = focused ? 'grid' : 'grid-outline';
        } else if (route.name === 'Users') {
          iconName = focused ? 'people' : 'people-outline';
        } else if (route.name === 'Analytics') {
          iconName = focused ? 'bar-chart' : 'bar-chart-outline';
        } else if (route.name === 'Settings') {
          iconName = focused ? 'settings' : 'settings-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#6200ee',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen 
      name="AdminHome" 
      component={AdminDashboardScreen} 
      options={{ title: 'Dashboard' }}
    />
    <Tab.Screen name="Users" component={AdminUsersScreen} />
    <Tab.Screen name="Analytics" component={AdminAnalyticsScreen} />
    <Tab.Screen name="Settings" component={AdminSettingsScreen} />
  </Tab.Navigator>
);

// Contractor tab navigator
const ContractorTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'ContractorHome') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Referrals') {
          iconName = focused ? 'people' : 'people-outline';
        } else if (route.name === 'ContractorAnalytics') {
          iconName = focused ? 'pie-chart' : 'pie-chart-outline';
        } else if (route.name === 'ContractorProfile') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#6200ee',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen 
      name="ContractorHome" 
      component={ContractorDashboardScreen} 
      options={{ title: 'Dashboard' }}
    />
    <Tab.Screen name="Referrals" component={ContractorReferralsScreen} />
    <Tab.Screen 
      name="ContractorAnalytics" 
      component={ContractorAnalyticsScreen} 
      options={{ title: 'Analytics' }}
    />
    <Tab.Screen 
      name="ContractorProfile" 
      component={ProfileScreen} 
      options={{ title: 'Profile' }}
    />
  </Tab.Navigator>
);

// Main app navigator
const AppNavigator = ({ userToken, userType }) => {
  return (
    <NavigationContainer>
      {userToken === null ? (
        // User is not logged in, show auth screens
        <AuthNavigator />
      ) : (
        // User is logged in, show appropriate dashboard based on role
        <>
          {userType === 'admin' ? (
            <AdminTabNavigator />
          ) : userType === 'contractor' ? (
            <ContractorTabNavigator />
          ) : (
            <MainTabNavigator />
          )}
        </>
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;