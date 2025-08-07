# CryptoEvokeExchange Mobile App

A mobile application version of the CryptoEvokeExchange cryptocurrency trading platform for EvokeEssence s.r.o, connecting to the existing server infrastructure.

## Overview

This repository contains both the mobile app (React Native) and the necessary backend server modifications to support mobile device connectivity, authentication, and real-time data streaming.

## Features

- **Secure Authentication**: Multi-factor authentication with mobile-specific session handling
- **Real-time Price Data**: WebSocket connections for live cryptocurrency price updates
- **Push Notifications**: Transaction alerts, price alerts, and security notifications 
- **Wallet Management**: View and manage cryptocurrency balances
- **Trading Interface**: Execute trades directly from your mobile device
- **Referral System**: Track referrals and commissions through the mobile interface
- **KYC Integration**: Complete verification processes on mobile
- **Multi-language Support**: Comprehensive i18n implementation

## Project Structure

- `/mobile` - React Native mobile application
  - `/src` - Source code for the mobile app
    - `/api` - API client and endpoints 
    - `/components` - Reusable UI components
    - `/screens` - App screens
    - `/navigation` - Navigation configuration
    - `/services` - Business logic and services
    - `/hooks` - Custom React hooks
    - `/config` - App configuration
    - `/utils` - Utility functions
    - `/assets` - Images and other static assets
    - `/types` - TypeScript type definitions

- `/server` - Backend modifications to support the mobile app
  - Added API endpoints and WebSocket support
  - Mobile-specific authentication handling
  - Push notification infrastructure

- `/client` - Web client codebase (for reference purposes)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- React Native development environment
- iOS: XCode 13+
- Android: Android Studio, JDK 11+

### Environment Setup

1. Clone this repository
   ```
   git clone https://github.com/yourusername/evokeessence-exchange.git
   cd evokeessence-exchange
   ```

2. Install dependencies
   ```
   npm install
   cd mobile && npm install
   ```

3. Create a `.env` file based on `.env.example` with your configuration

4. Start the development server
   ```
   npm run dev
   ```

5. Run the mobile app
   ```
   cd mobile
   npx react-native run-ios
   # or
   npx react-native run-android
   ```

## API Integration

The mobile app connects to the existing CryptoEvokeExchange API. See the [iOS App Integration Guide](ios-app-integration-guide.md) for detailed information on how the mobile app integrates with the backend services.

## Push Notifications

The app uses Firebase Cloud Messaging (FCM) for Android and Apple Push Notification service (APNs) for iOS. See the [Push Notification Guide](ios-push-notification-guide.md) for setup instructions.

## Security

This mobile application follows industry best practices for secure mobile development:

- Certificate pinning for API communications
- Secure storage of authentication tokens
- Biometric authentication support
- Jailbreak/root detection
- Encrypted local data storage
- Connection to secure API endpoints

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

EvokeEssence s.r.o - contact@evokeessence.com