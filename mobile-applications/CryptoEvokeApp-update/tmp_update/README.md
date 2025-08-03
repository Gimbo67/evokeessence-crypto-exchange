# CryptoEvokeExchange Mobile App

Mobile application for EvokeEssence's CryptoEvokeExchange platform.

## About

This iOS application connects to the CryptoEvokeExchange platform, providing a mobile interface for all the features available on the web version:

- User authentication (login, registration)
- Client verification system
- Account management
- Cryptocurrency trading
- Admin and employee dashboards

## Getting Started

### Prerequisites

- macOS (required for iOS development)
- Node.js 16 or later
- Xcode 14 or later
- CocoaPods (`sudo gem install cocoapods`)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/evokeessence/evokeessence-exchange-mobile.git
   cd evokeessence-exchange-mobile
   ```

2. Install JavaScript dependencies:
   ```
   npm install
   ```

3. Install iOS dependencies:
   ```
   cd ios
   pod install
   cd ..
   ```

### Running the app

#### Using Xcode (Recommended)

1. Open the project in Xcode:
   ```
   open ios/CryptoEvokeApp.xcworkspace
   ```

2. Select a simulator or connected device
3. Click the Run button or press `Cmd+R`

#### Using Command Line

Run the app in the iOS simulator:
```
npm run ios
```

## Development

### Project Structure

- `/src` - React Native source code
  - `/api` - API client implementation
  - `/components` - Reusable UI components
  - `/screens` - Application screens
  - `/navigation` - Navigation configuration
  - `/store` - State management
  - `/utils` - Utility functions and helpers

- `/ios` - Native iOS project files

### Connecting to Backend

The app connects to the same backend as the web application. The API endpoints are configured in `src/config/api.ts`. Update the `API_BASE_URL` to match your server configuration.

## Building for Production

To build a production-ready IPA file for distribution:

1. Open the project in Xcode
2. Select "Generic iOS Device" as the build target
3. Select Product > Archive from the menu
4. Follow the prompts to create an IPA file

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support or questions, please contact the EvokeEssence development team.