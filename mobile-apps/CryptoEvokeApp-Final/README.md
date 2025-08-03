# CryptoEvokeApp iOS Application

A complete React Native iOS application for the CryptoEvoke cryptocurrency exchange platform.

## Features
- Full authentication system with login/registration
- Role-based dashboards for Admin, Employee, Verified and Unverified users
- Real-time cryptocurrency prices
- Admin management tools
- Employee verification system
- Fully compatible with iOS 13 through iOS 18
- Works with Xcode 16.2 and newer

## Requirements
- macOS with Xcode 16.2 or newer
- Node.js 16 or newer
- CocoaPods

## Installation

1. Extract the zip file to your desired location
2. Install JavaScript dependencies:
   ```bash
   cd CryptoEvokeApp-Final
   npm install
   ```

3. Install iOS dependencies:
   ```bash
   cd ios
   pod cache clean --all
   pod install
   ```

4. Open the project in Xcode:
   ```bash
   open CryptoEvokeApp.xcworkspace
   ```

5. In Xcode:
   - Verify deployment target is set to iOS 13.0
   - Configure your development team for signing
   - Set the bundle identifier (e.g., com.evokeessence.cryptoevokeapp)
   - Make sure "Validate Workspace" is set to YES in Build Settings

6. Build and run the application (⌘+R)

## Troubleshooting

If you encounter boost-related errors during pod installation:
```bash
BOOST_LIBRARY_PATH=/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/lib pod install
```

If you're getting compiler errors related to the boost library:
1. Open the Podfile
2. Make sure the pre_install hook is correctly configured for boost

## Project Structure
- `/App.tsx` - Main application component
- `/src/api` - API client configuration
- `/src/screens` - All screen components
- `/src/store` - Auth context and state management
- `/src/navigation` - Navigation configuration
- `/ios` - iOS native code and configuration

## Making Changes
If you need to modify the API endpoint:
1. Open `/src/api/apiClient.ts`
2. Update the `BASE_URL` constant

## iOS Compatibility
This app has been specifically configured to work with:
- iOS 13.0 and above (including iOS 18)
- Xcode 16.2 and above
- iPhone models from iPhone XR and newer
- Both light and dark mode

The Podfile includes special configurations to ensure compatibility with boost library and newer iOS versions.