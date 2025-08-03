# CryptoEvoke Exchange iOS App

This is the official mobile app for the CryptoEvoke Exchange platform, allowing users to access all the functionality of the evo-exchange.com website directly from their iOS devices.

## Features

- Authentication with your existing evo-exchange.com account
- Real-time cryptocurrency price updates
- Deposit management
- Profile management
- Special dashboards for contractors and admins
- KYC status tracking

## Requirements

- Node.js 14 or newer
- Expo CLI
- iOS Simulator or physical iOS device for testing
- Xcode (for building the iOS app)

## Installation

1. Install dependencies:
   ```
   cd mobile-app
   npm install
   ```

2. Start the Expo development server:
   ```
   npm start
   ```

3. Run on iOS Simulator or physical device:
   - Press `i` to run on iOS Simulator
   - Scan the QR code with the Expo Go app on your physical device

## Building for Production

To create a production build for App Store distribution:

1. Install EAS CLI:
   ```
   npm install -g eas-cli
   ```

2. Log in to your Expo account:
   ```
   eas login
   ```

3. Configure the build:
   ```
   eas build:configure
   ```

4. Start the build process:
   ```
   eas build --platform ios
   ```

5. Follow the prompts to complete the build process

## Configuration

The app is configured to connect to the production evo-exchange.com API. If you need to change API endpoints:

- Edit the `API_BASE_URL` in `src/api/config.js`

## User Roles

The app supports different user roles with tailored experiences:

- Regular users: Basic dashboard with account info and market data
- Contractors: Additional referral tracking features
- Admins: Complete platform overview with user management

## Support

For questions or issues:
- Email: support@evo-exchange.com
- Website: https://evo-exchange.com/contact