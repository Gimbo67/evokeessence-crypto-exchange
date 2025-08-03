# CryptoEvokeApp - iOS Mobile Application

A React Native iOS application for the EvokeEssence Cryptocurrency Exchange platform.

## Features

- User authentication (login/register)
- Role-based dashboards (Admin, Employee, User)
- Real-time cryptocurrency pricing
- Account management
- Transaction history
- KYC verification interface

## iOS Compatibility

- Supports iOS 13.0 through iOS 18.0
- Compatible with iPhone and iPad devices
- Optimized for Xcode 16.2+

## Installation

### Prerequisites

- Node.js 16 or newer
- Xcode 16.2+ (Mac only)
- CocoaPods

### Setup Instructions

1. Clone or extract this repository
2. Install JavaScript dependencies:
   ```
   npm install
   ```
3. Install iOS dependencies:
   ```
   cd ios
   pod install
   ```
4. Open the iOS project:
   ```
   open CryptoEvokeApp.xcworkspace
   ```
5. Build and run the project in Xcode

## Troubleshooting

### Common Issues

#### Boost Library Problems

The Podfile already includes fixes for known boost library issues that can occur with newer React Native versions. If you encounter issues, check that the pre_install hook in the Podfile is properly configured.

#### iOS Compatibility

This app is configured to work with iOS 13.0 through iOS 18.0. The post_install hook in the Podfile ensures proper deployment target settings for all pods.

#### Missing Xcode Project

If Xcode project files are missing, you may need to create a new React Native project and copy over the source files:

```bash
npx react-native init CryptoEvokeApp
# Then copy the src folder from this project to the new one
```

## Backend API Connection

This app is configured to connect to the EvokeEssence API. The base URL can be configured in `src/api/apiClient.ts`.

## Project Structure

- `/src/api` - API client and services
- `/src/screens` - App screens organized by feature
- `/src/navigation` - Navigation configuration
- `/src/store` - State management (authentication context)

## License

Copyright © 2025 EvokeEssence s.r.o. All rights reserved.