import React, { useEffect, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, ActivityIndicator } from 'react-native';

// Import our navigation and auth context
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/store/AuthContext';

const App = () => {
  // Simple implementation of a splash screen using state
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate splash screen for 1.5 seconds
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050A30" />
      {isLoading ? (
        <View style={styles.splashScreen}>
          <Text style={styles.splashTitle}>CryptoEvokeApp</Text>
          <ActivityIndicator size="large" color="#050A30" style={styles.loader} />
        </View>
      ) : (
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  splashScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  splashTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#050A30',
    marginBottom: 20,
  },
  loader: {
    marginTop: 20,
  },
});

export default App;