import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';

// Import screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import UnverifiedDashboardScreen from '../screens/dashboard/UnverifiedDashboardScreen';
import AdminDashboardScreen from '../screens/dashboard/AdminDashboardScreen';
import EmployeeDashboardScreen from '../screens/dashboard/EmployeeDashboardScreen';

// Import auth context
import { AuthContext } from '../store/AuthContext';

// Define the stack navigator types
const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const authContext = useContext(AuthContext);
  const { isAuthenticated, userData } = authContext;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#050A30',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!isAuthenticated ? (
          // Authentication screens
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ title: 'Login' }} 
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen} 
              options={{ title: 'Register' }} 
            />
          </>
        ) : (
          // Dashboard screens based on user role
          <>
            {userData?.isAdmin ? (
              <Stack.Screen 
                name="AdminDashboard" 
                component={AdminDashboardScreen}
                options={{ title: 'Admin Dashboard' }} 
              />
            ) : userData?.isEmployee ? (
              <Stack.Screen 
                name="EmployeeDashboard" 
                component={EmployeeDashboardScreen}
                options={{ title: 'Employee Dashboard' }} 
              />
            ) : userData?.isVerified ? (
              <Stack.Screen 
                name="Dashboard" 
                component={DashboardScreen}
                options={{ title: 'Dashboard' }} 
              />
            ) : (
              <Stack.Screen 
                name="UnverifiedDashboard" 
                component={UnverifiedDashboardScreen}
                options={{ title: 'Complete Verification' }} 
              />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;