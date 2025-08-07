import React, { useState, useEffect } from 'react';
import { StatusBar, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './navigation/AppNavigator';
import { useAuth } from './hooks/useAuth';

// Create a client for React Query
const queryClient = new QueryClient();

// Auth provider component
const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, loading, checkAuthStatus } = useAuth();

  useEffect(() => {
    // Check authentication status on app start
    checkAuthStatus();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Loading EvokeEssence Exchange...</Text>
      </View>
    );
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AuthProvider>
        {({ isAuthenticated }) => (
          <AppNavigator isAuthenticated={isAuthenticated} />
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});

export default App;