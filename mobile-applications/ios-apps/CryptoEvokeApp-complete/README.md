# CryptoEvokeApp - iOS Installation Guide

This document provides step-by-step instructions to install and run the CryptoEvokeApp iOS application.

## Prerequisites

Before you begin, ensure you have the following installed on your Mac:

1. **Node.js** (v16 or higher) and npm
2. **Xcode** (14.0 or higher)
3. **CocoaPods** (`sudo gem install cocoapods`)
4. **Xcode Command Line Tools** (run `xcode-select --install` in terminal)

## Installation Steps

### 1. Extract the zip file

```bash
unzip CryptoEvokeApp-iOS.zip -d CryptoEvokeApp
cd CryptoEvokeApp
```

### 2. Install JavaScript dependencies

```bash
npm install
```

### 3. Install iOS dependencies

```bash
cd ios
pod install
cd ..
```

### 4. Open the project in Xcode

```bash
open ios/CryptoEvokeApp.xcworkspace
```

Note: Do NOT open the .xcodeproj file, as this will not include the CocoaPods dependencies.

### 5. Configure Xcode settings

1. Select the "CryptoEvokeApp" project in the Project Navigator
2. Go to the "CryptoEvokeApp" target
3. In the "General" tab, ensure:
   - Deployment Target is set to iOS 13.0 or higher
   - Bundle Identifier is set to a unique identifier (e.g., "com.yourcompany.CryptoEvokeApp")
   - Team is set to your Apple Developer account (if you're planning to run on a physical device)

### 6. Build and run the app

Click the Run button (triangle play icon) in Xcode to build and run the app on your selected simulator or device.

## Troubleshooting

If you encounter any issues:

### CocoaPods Issues

If pod installation fails with errors:

```bash
cd ios
pod deintegrate
pod setup
pod install
```

### Build Errors

1. Clean the build folder: In Xcode, select "Product" > "Clean Build Folder"
2. Delete derived data: In Xcode, select "File" > "Workspace Settings" > "Derived Data" > Click the arrow next to the path and delete the folder

### React Native Issues

If the JavaScript bundler has issues:

```bash
# From the project root
npm start -- --reset-cache
```

In a separate terminal window:

```bash
cd ios
xcrun simctl launch booted com.yourcompany.CryptoEvokeApp
```

## App Structure

The app includes:
- Authentication system (login/registration)
- Role-based dashboards (Admin, Employee, User)
- API integration with the CryptoEvokeExchange backend
- Secure local storage for credentials

## Contact

For support, please contact the development team.