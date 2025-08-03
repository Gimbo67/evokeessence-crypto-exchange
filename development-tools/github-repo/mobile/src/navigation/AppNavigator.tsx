import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Import screens (these would be implemented in their respective files)
// Auth Screens
const SignInScreen = () => <></>;
const SignUpScreen = () => <></>;
const ForgotPasswordScreen = () => <></>;
const TwoFactorAuthScreen = () => <></>;

// Main App Screens
const HomeScreen = () => <></>;
const MarketScreen = () => <></>;
const WalletScreen = () => <></>;
const ProfileScreen = () => <></>;
const SettingsScreen = () => <></>;

// Define navigator types
const AuthStack = createStackNavigator();
const MainTab = createBottomTabNavigator();
const SettingsStack = createStackNavigator();
const RootStack = createStackNavigator();

// Auth Navigator
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="SignIn" component={SignInScreen} />
    <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <AuthStack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreen} />
  </AuthStack.Navigator>
);

// Settings Navigator
const SettingsNavigator = () => (
  <SettingsStack.Navigator>
    <SettingsStack.Screen name="Settings" component={SettingsScreen} />
    {/* Add more settings screens here */}
  </SettingsStack.Navigator>
);

// Main Tab Navigator
const MainNavigator = () => (
  <MainTab.Navigator>
    <MainTab.Screen name="Home" component={HomeScreen} />
    <MainTab.Screen name="Market" component={MarketScreen} />
    <MainTab.Screen name="Wallet" component={WalletScreen} />
    <MainTab.Screen name="Profile" component={ProfileScreen} />
    <MainTab.Screen name="SettingsTab" component={SettingsNavigator} />
  </MainTab.Navigator>
);

// Root Navigator
const AppNavigator = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;