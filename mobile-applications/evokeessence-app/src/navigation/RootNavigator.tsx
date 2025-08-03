import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import TwoFactorVerifyScreen from '../screens/auth/TwoFactorVerifyScreen';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { user, isLoading } = useAuth();
  
  // Show loading screen while auth state is being checked
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }
  
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      {user ? (
        // Authenticated user routes
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        // Unauthenticated routes
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="TwoFactorVerify" component={TwoFactorVerifyScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;