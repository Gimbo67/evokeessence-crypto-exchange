import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../store/AuthContext';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import AdminDashboardScreen from '../screens/dashboard/AdminDashboardScreen';
import EmployeeDashboardScreen from '../screens/dashboard/EmployeeDashboardScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import UnverifiedDashboardScreen from '../screens/dashboard/UnverifiedDashboardScreen';

const AuthStack = createStackNavigator();
const AppStack = createStackNavigator();

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
};

const AppNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // or a loading screen
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthNavigator />
      ) : (
        <AppStack.Navigator>
          {user.isAdmin ? (
            <AppStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
          ) : user.isEmployee ? (
            <AppStack.Screen name="EmployeeDashboard" component={EmployeeDashboardScreen} />
          ) : !user.isVerified ? (
            <AppStack.Screen name="UnverifiedDashboard" component={UnverifiedDashboardScreen} />
          ) : (
            <AppStack.Screen name="Dashboard" component={DashboardScreen} />
          )}
        </AppStack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
