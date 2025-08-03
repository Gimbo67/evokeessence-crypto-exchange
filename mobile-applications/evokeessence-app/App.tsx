import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import VerificationStatusListener from './src/components/VerificationStatusListener';
import TransactionUpdateListener from './src/components/TransactionUpdateListener';
import biometricService from './src/services/biometricService';

// AppContent component to use hooks that require AuthContext
const AppContent = () => {
  const { user } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check if biometric authentication is needed on app startup
  useEffect(() => {
    const checkBiometricAuth = async () => {
      if (user) {
        const shouldAuthenticate = await biometricService.shouldAuthenticateOnStartup();
        
        if (shouldAuthenticate) {
          const authenticated = await biometricService.authenticate(
            'Authenticate to access your account'
          );
          
          setIsAuthenticated(authenticated);
        } else {
          // No biometric auth needed, set as authenticated
          setIsAuthenticated(true);
        }
      }
    };
    
    checkBiometricAuth();
  }, [user]);
  
  // If user is logged in and either biometric auth is not required or has been completed
  const showContent = !user || isAuthenticated;
  
  return (
    <>
      {showContent && <RootNavigator />}
      
      {/* Only mount listeners when user is logged in and authenticated */}
      {user && isAuthenticated && (
        <>
          <VerificationStatusListener />
          <TransactionUpdateListener />
        </>
      )}
      
      <StatusBar style="auto" />
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}