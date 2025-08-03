import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../store/AuthContext';

// Define the type for our navigation prop
type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
};

type SplashScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Splash'>;

const SplashScreen = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Navigate to the appropriate screen after a delay
    const timer = setTimeout(() => {
      if (!isLoading) {
        if (isAuthenticated) {
          // User is already authenticated, will be handled by AppNavigator
        } else {
          navigation.replace('Login');
        }
      }
    }, 2000); // Show splash for 2 seconds

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, navigation]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/splash.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>CryptoEvokeExchange</Text>
      <Text style={styles.subtitle}>Your trusted cryptocurrency partner</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050A30', // Dark blue background
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
  },
});

export default SplashScreen;