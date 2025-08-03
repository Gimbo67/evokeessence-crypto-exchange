# CryptoEvokeApp iOS - Complete Setup Guide

This guide will help you create a complete iOS React Native application with all necessary Xcode project files that is compatible with iOS 13-18 and includes all required fixes.

## Step 1: Create the React Native Project with TypeScript Template

Open Terminal on your Mac and run:

```bash
# Create a new React Native project with TypeScript template
npx react-native init CryptoEvokeApp --template react-native-template-typescript
cd CryptoEvokeApp
```

## Step 2: Update the iOS Podfile for iOS 13-18 Compatibility

Edit the Podfile in the ios directory:

```bash
cd ios
nano Podfile  # or open with any text editor
```

Replace the content with:

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

## Step 3: Install Required Dependencies

Go back to the project root directory:

```bash
cd ..
```

Install dependencies:

```bash
npm install @react-navigation/native @react-navigation/stack react-native-reanimated@2.17.0 react-native-gesture-handler react-native-safe-area-context react-native-screens @react-native-async-storage/async-storage axios
```

## Step 4: Update App.tsx

Replace the content of App.tsx with:

```tsx
import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {View, Text, StyleSheet, Button} from 'react-native';

const Stack = createStackNavigator();

// Home Screen Component
const HomeScreen = ({navigation}: any) => {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>CryptoEvoke Exchange</Text>
      <Text style={styles.subtitle}>Mobile iOS App</Text>
      <View style={styles.buttonContainer}>
        <Button 
          title="Login" 
          onPress={() => navigation.navigate('Login')} 
        />
      </View>
      <View style={styles.buttonContainer}>
        <Button 
          title="Register" 
          onPress={() => navigation.navigate('Register')} 
        />
      </View>
    </View>
  );
};

// Login Screen Component
const LoginScreen = () => {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Login Screen</Text>
      <Text style={styles.text}>Login functionality will be implemented here</Text>
    </View>
  );
};

// Register Screen Component
const RegisterScreen = () => {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Register Screen</Text>
      <Text style={styles.text}>Registration functionality will be implemented here</Text>
    </View>
  );
};

// App Component
const App = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen name="Home" component={HomeScreen} options={{title: 'CryptoEvoke'}} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

// Styles
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 32,
  },
  text: {
    fontSize: 16,
    marginBottom: 16,
  },
  buttonContainer: {
    marginVertical: 8,
    width: '80%',
  },
});

export default App;
```

## Step 5: Install Pods and Open in Xcode

Install the iOS dependencies:

```bash
cd ios
pod install
```

Open the Xcode workspace:

```bash
open CryptoEvokeApp.xcworkspace
```

## Step 6: Update iOS Deployment Target in Xcode

In Xcode:
1. Select the project in the navigator panel (blue icon)
2. Select the "CryptoEvokeApp" target
3. Go to the "General" tab
4. Change "iOS Deployment Target" to "iOS 13.0"
5. In "Signing & Capabilities", select your development team

## Step 7: Build and Run

In Xcode, click the Run button (the play icon) to build and run the app in the iOS simulator.

## Step 8: Create a Zip Archive

Once everything is working, you can create a zip archive of the entire project:

```bash
# Go back to parent directory
cd ..
cd ..

# Create a zip archive
zip -r CryptoEvokeApp-iOS.zip CryptoEvokeApp
```

This will create a complete zip file with all Xcode project files included.

## Troubleshooting

If you encounter any issues with the pods installation:

```bash
cd ios
pod cache clean --all
pod deintegrate
pod install
```

If you see build errors in Xcode related to React Native packages:

```bash
cd ..
npx react-native-clean-project
cd ios
pod install
```

## Next Steps

After getting the basic project working, you can start adding:

1. API client configuration
2. Authentication screens and logic
3. Dashboard screens for different user roles
4. Navigation setup
5. State management

The project structure created with this guide will have all the Xcode project files properly configured, with iOS 13-18 compatibility out of the box.