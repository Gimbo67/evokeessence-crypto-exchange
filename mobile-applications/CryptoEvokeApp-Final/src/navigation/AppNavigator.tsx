import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../store/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import UnverifiedDashboardScreen from '../screens/dashboard/UnverifiedDashboardScreen';
import AdminDashboardScreen from '../screens/dashboard/AdminDashboardScreen';
import EmployeeDashboardScreen from '../screens/dashboard/EmployeeDashboardScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, userRole } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          {userRole === 'admin' && (
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
          )}
          {userRole === 'employee' && (
            <Stack.Screen name="EmployeeDashboard" component={EmployeeDashboardScreen} />
          )}
          {userRole === 'unverified' && (
            <Stack.Screen name="UnverifiedDashboard" component={UnverifiedDashboardScreen} />
          )}
          {userRole === 'verified' && (
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
          )}
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;