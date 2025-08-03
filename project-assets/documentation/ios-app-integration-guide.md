# Complete iOS App Integration Guide for CryptoEvokeApp

This guide will help you set up a complete iOS React Native application for the CryptoEvokeExchange platform with all necessary configurations.

## Prerequisites
- Xcode 16.2 or higher
- Node.js and npm
- CocoaPods

## Step 1: Create the React Native Project

```bash
# Create a new React Native project with TypeScript template
npx react-native init CryptoEvokeApp --template react-native-typescript-template
cd CryptoEvokeApp
```

## Step 2: Configure iOS Platform Files

### Update Podfile
Replace the contents of your `ios/Podfile` with:

```ruby
require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

platform :ios, '13.0'
prepare_react_native_project!

# Fix for boost installation issues
install! 'cocoapods', :deterministic_uuids => false

# Skip boost installation problems
pre_install do |installer|
  installer.pod_targets.each do |pod|
    if pod.name.start_with?('boost')
      def pod.build_type
        Pod::BuildType.static_library
      end
    end
  end
end

target 'CryptoEvokeApp' do
  config = use_native_modules!

  # Flags change depending on the env values.
  flags = get_default_flags()

  use_react_native!(
    :path => config[:reactNativePath],
    # Hermes is now enabled by default. Disable by setting this flag to false.
    :hermes_enabled => flags[:hermes_enabled],
    :fabric_enabled => flags[:fabric_enabled],
    # An absolute path to your application root.
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false
    )
    __apply_Xcode_12_5_M1_post_install_workaround(installer)
    
    # Fix for iOS 18+ compatibility
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
      end
    end
  end
end
```

### Update iOS Project Settings
1. Open the Xcode project:
```bash
cd ios
open CryptoEvokeApp.xcworkspace
```

2. In Xcode:
   - Select the "CryptoEvokeApp" project in the navigator
   - Go to "Build Settings"
   - Set "iOS Deployment Target" to "13.0"
   - In "Signing & Capabilities", select your developer team

## Step 3: Install Required Dependencies

```bash
# Install the required dependencies
npm install @react-navigation/native @react-navigation/stack react-native-reanimated@2.17.0 react-native-gesture-handler react-native-safe-area-context react-native-screens @react-native-async-storage/async-storage axios
```

## Step 4: Create App Structure

Replace your `App.tsx` with:

```tsx
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/store/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

const App = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
};

export default App;
```

## Step 5: Create API Client

Create a file at `src/api/apiClient.ts`:

```typescript
import axios from 'axios';

const API_BASE_URL = "https://api.evokeessence.com";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "Mobile-App": "ios"
  }
});

export default apiClient;
```

## Step 6: Create Auth Context

Create a file at `src/store/AuthContext.tsx`:

```typescript
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/apiClient';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    // Check for existing session on app load
    const checkAuth = async () => {
      try {
        const response = await apiClient.get('/api/auth/session');
        if (response.data.authenticated) {
          setIsAuthenticated(true);
          setUser(response.data.user);
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/auth/login', { username, password });
      if (response.data.success) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        await AsyncStorage.setItem('userSession', JSON.stringify(response.data));
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/auth/register', userData);
      if (response.data.success) {
        setIsAuthenticated(true);
        setUser(response.data.user);
        await AsyncStorage.setItem('userSession', JSON.stringify(response.data));
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.post('/api/auth/logout');
      await AsyncStorage.removeItem('userSession');
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Step 7: Create Navigation

Create a file at `src/navigation/AppNavigator.tsx`:

```typescript
import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthContext } from '../store/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import AdminDashboardScreen from '../screens/dashboard/AdminDashboardScreen';
import EmployeeDashboardScreen from '../screens/dashboard/EmployeeDashboardScreen';
import UnverifiedDashboardScreen from '../screens/dashboard/UnverifiedDashboardScreen';
import { ActivityIndicator, View } from 'react-native';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, isLoading, user } = useContext(AuthContext);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        {!isAuthenticated ? (
          // Auth screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // App screens based on user type
          <>
            {user?.isAdmin ? (
              <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            ) : user?.isEmployee ? (
              <Stack.Screen name="EmployeeDashboard" component={EmployeeDashboardScreen} />
            ) : !user?.verified ? (
              <Stack.Screen name="UnverifiedDashboard" component={UnverifiedDashboardScreen} />
            ) : (
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
```

## Step 8: Create Authentication Screens

Create a file at `src/screens/auth/LoginScreen.tsx`:

```typescript
import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '../../store/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';

type LoginScreenProps = {
  navigation: StackNavigationProp<any>;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username, password);
      // Navigation happens automatically in AppNavigator based on auth state
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Please check your credentials and try again');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login to CryptoEvoke</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter your username"
          autoCapitalize="none"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry
        />
      </View>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleLogin}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.footer}>
        <Text>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#f5f5f5',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  link: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
});

export default LoginScreen;
```

Create a file at `src/screens/auth/RegisterScreen.tsx`:

```typescript
import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { AuthContext } from '../../store/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';

type RegisterScreenProps = {
  navigation: StackNavigationProp<any>;
};

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useContext(AuthContext);

  const updateFormField = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  const handleRegister = async () => {
    // Basic validation
    if (
      !formData.username ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.firstName ||
      !formData.lastName
    ) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      };
      
      await register(userData);
      // Navigation happens automatically in AppNavigator based on auth state
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Please try again with different information');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={formData.username}
          onChangeText={(value) => updateFormField('username', value)}
          placeholder="Choose a username"
          autoCapitalize="none"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={formData.email}
          onChangeText={(value) => updateFormField('email', value)}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          value={formData.firstName}
          onChangeText={(value) => updateFormField('firstName', value)}
          placeholder="Enter your first name"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          value={formData.lastName}
          onChangeText={(value) => updateFormField('lastName', value)}
          placeholder="Enter your last name"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={formData.password}
          onChangeText={(value) => updateFormField('password', value)}
          placeholder="Choose a password"
          secureTextEntry
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          value={formData.confirmPassword}
          onChangeText={(value) => updateFormField('confirmPassword', value)}
          placeholder="Confirm your password"
          secureTextEntry
        />
      </View>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleRegister}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.footer}>
        <Text>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#f5f5f5',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  link: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
```

## Step 9: Create Dashboard Screens

Create a file at `src/screens/dashboard/DashboardScreen.tsx`:

```typescript
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { AuthContext } from '../../store/AuthContext';
import apiClient from '../../api/apiClient';

const DashboardScreen = () => {
  const { user, logout } = useContext(AuthContext);
  const [cryptoPrices, setCryptoPrices] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCryptoPrices();
  }, []);

  const fetchCryptoPrices = async () => {
    try {
      const response = await apiClient.get('/api/market/prices');
      setCryptoPrices(response.data);
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, {user?.firstName || 'User'}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.userInfoSection}>
        <Text style={styles.sectionTitle}>Your Account</Text>
        <View style={styles.userInfoItem}>
          <Text style={styles.label}>Username:</Text>
          <Text style={styles.value}>{user?.username}</Text>
        </View>
        <View style={styles.userInfoItem}>
          <Text style={styles.label}>Email:</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>
        <View style={styles.userInfoItem}>
          <Text style={styles.label}>Account Status:</Text>
          <Text style={styles.value}>
            {user?.verified ? 'Verified' : 'Unverified'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cryptocurrency Prices</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : cryptoPrices ? (
          <View style={styles.cryptoGrid}>
            {Object.entries(cryptoPrices).map(([symbol, data]: [string, any]) => (
              <View key={symbol} style={styles.cryptoCard}>
                <Text style={styles.cryptoSymbol}>{symbol}</Text>
                <Text style={styles.cryptoPrice}>${data.usd.toLocaleString()}</Text>
                <Text style={[
                  styles.cryptoChange,
                  { color: data.usd_24h_change >= 0 ? 'green' : 'red' }
                ]}>
                  {data.usd_24h_change >= 0 ? '▲' : '▼'} 
                  {Math.abs(data.usd_24h_change).toFixed(2)}%
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text>Unable to load cryptocurrency prices</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#f44336',
    borderRadius: 5,
  },
  logoutText: {
    color: 'white',
    fontWeight: 'bold',
  },
  userInfoSection: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  userInfoItem: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  label: {
    fontWeight: '500',
    width: 120,
  },
  value: {
    flex: 1,
  },
  cryptoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cryptoCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  cryptoSymbol: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  cryptoPrice: {
    fontSize: 18,
    marginVertical: 5,
  },
  cryptoChange: {
    fontSize: 14,
  },
});

export default DashboardScreen;
```

Create the other dashboard screens similarly:
- `src/screens/dashboard/AdminDashboardScreen.tsx`
- `src/screens/dashboard/EmployeeDashboardScreen.tsx`
- `src/screens/dashboard/UnverifiedDashboardScreen.tsx`

## Step 10: Install and Build

```bash
# Install dependencies
npm install

# Install iOS dependencies
cd ios
pod install
cd ..

# Run the app (in iOS simulator)
npx react-native run-ios
```

## Troubleshooting

### React Native Reanimated Issues
If you encounter issues with Reanimated, make sure you're using version 2.17.0 which is compatible with current React Native versions:

```bash
npm uninstall react-native-reanimated
npm install react-native-reanimated@2.17.0
```

### Xcode Project Issues
If your Xcode project has issues:

1. Delete the derived data:
```bash
rm -rf ~/Library/Developer/Xcode/DerivedData
```

2. Clean the Xcode project:
- In Xcode, go to Product > Clean Build Folder

3. Reinstall the pods:
```bash
cd ios
pod cache clean --all
pod install
```

4. If all else fails, try:
```bash
cd ios
pod deintegrate
pod setup
pod install
```

### Build Configuration Issues
If you encounter build configuration issues in Xcode:

1. Make sure deployment target is set to iOS 13.0 in Xcode:
   - Select the project in the navigator
   - Select the "CryptoEvokeApp" target
   - Go to the "General" tab
   - Set "Deployment Info" > "iOS Deployment Target" to "13.0"

2. Check Pod settings:
   - Make sure platform :ios, '13.0' is set in your Podfile
   - Run pod update

3. If you get boost-related errors:
   - The Podfile includes a fix for this, make sure it's being applied
   - Check if the pod cache is an issue with: pod cache clean --all

## Conclusion

Following this guide will give you a complete React Native iOS app integrated with the CryptoEvokeExchange platform. The app is configured to work with iOS 13.0 and above, with all necessary compatibility fixes already included.