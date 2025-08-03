import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Import screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import UnverifiedDashboardScreen from '../screens/dashboard/UnverifiedDashboardScreen';
import AdminDashboardScreen from '../screens/dashboard/AdminDashboardScreen';
import EmployeeDashboardScreen from '../screens/dashboard/EmployeeDashboardScreen';

// Import auth context
import { useAuth, UserRole } from '../store/AuthContext';

// Define the types for our stack navigator
type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  Register: undefined;
};

type ClientStackParamList = {
  Dashboard: undefined;
  UnverifiedDashboard: undefined;
};

type AdminStackParamList = {
  AdminDashboard: undefined;
};

type EmployeeStackParamList = {
  EmployeeDashboard: undefined;
};

// Create the navigators
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const ClientStack = createNativeStackNavigator<ClientStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const EmployeeStack = createNativeStackNavigator<EmployeeStackParamList>();

// Auth navigator (login/register screens)
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
};

// Client navigator (normal user screens)
const ClientNavigator = () => {
  const { user } = useAuth();
  
  return (
    <ClientStack.Navigator screenOptions={{ headerShown: false }}>
      {user?.isVerified ? (
        <ClientStack.Screen name="Dashboard" component={DashboardScreen} />
      ) : (
        <ClientStack.Screen name="UnverifiedDashboard" component={UnverifiedDashboardScreen} />
      )}
    </ClientStack.Navigator>
  );
};

// Admin navigator
const AdminNavigator = () => {
  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    </AdminStack.Navigator>
  );
};

// Employee navigator
const EmployeeNavigator = () => {
  return (
    <EmployeeStack.Navigator screenOptions={{ headerShown: false }}>
      <EmployeeStack.Screen name="EmployeeDashboard" component={EmployeeDashboardScreen} />
    </EmployeeStack.Navigator>
  );
};

// Main app navigator
const AppNavigator = () => {
  const { isAuthenticated, isLoading, user, checkAuth } = useAuth();

  // Check authentication status when app starts
  useEffect(() => {
    checkAuth();
  }, []);

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Return the appropriate navigator based on auth status and user role
  const getNavigator = () => {
    if (!isAuthenticated) {
      return <AuthNavigator />;
    }

    // User is authenticated, determine which dashboard to show based on role
    switch (user?.role) {
      case 'admin':
        return <AdminNavigator />;
      case 'employee':
        return <EmployeeNavigator />;
      case 'client':
      default:
        return <ClientNavigator />;
    }
  };

  return <NavigationContainer>{getNavigator()}</NavigationContainer>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigator;