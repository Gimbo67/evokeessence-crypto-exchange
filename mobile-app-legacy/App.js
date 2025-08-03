import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import context
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Import screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import TwoFactorScreen from './src/screens/auth/TwoFactorScreen';
import DashboardScreen from './src/screens/dashboard/DashboardScreen';
import MarketsScreen from './src/screens/markets/MarketsScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import DepositsScreen from './src/screens/deposits/DepositsScreen';
import ContractorDashboardScreen from './src/screens/contractor/ContractorDashboardScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import SplashScreen from './src/screens/SplashScreen';

// Create navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth navigator
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

// Contractor tab navigator
const ContractorTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'ContractorDashboard') {
          iconName = focused ? 'analytics' : 'analytics-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#6200ee',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen 
      name="ContractorDashboard" 
      component={ContractorDashboardScreen} 
      options={{ title: 'Dashboard' }}
    />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// Admin tab navigator
const AdminTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'AdminDashboard') {
          iconName = focused ? 'analytics' : 'analytics-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#6200ee',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen 
      name="AdminDashboard" 
      component={AdminDashboardScreen} 
      options={{ title: 'Admin' }}
    />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// Root navigator that checks authentication state
const RootNavigator = () => {
  const { isAuthenticated, isAdmin, isContractor, loading, requireTwoFactor } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return <SplashScreen />;
  }

  // Show 2FA screen if required
  if (requireTwoFactor) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="TwoFactor" component={TwoFactorScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        // Auth screens
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        // Authenticated screens based on user role
        <>
          {isAdmin ? (
            <Stack.Screen name="AdminMain" component={AdminTabNavigator} />
          ) : isContractor ? (
            <Stack.Screen name="ContractorMain" component={ContractorTabNavigator} />
          ) : (
            <Stack.Screen name="UserMain" component={MainTabNavigator} />
          )}
        </>
      )}
    </Stack.Navigator>
  );
};

// Main app component
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});