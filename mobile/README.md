# EvokeEssence Exchange Mobile App

This directory contains the React Native mobile application for EvokeEssence Exchange.

## Setup Instructions

### Prerequisites
- Node.js 18+
- React Native CLI
- XCode (for iOS development)
- Android Studio (for Android development)
- CocoaPods (for iOS)

### Initial Setup

1. Install React Native CLI globally:
```bash
npm install -g react-native-cli
```

2. Create a new React Native project:
```bash
npx react-native init EvokeExchangeApp --template react-native-template-typescript
```

3. Install essential dependencies:
```bash
cd EvokeExchangeApp
npm install @react-navigation/native @react-navigation/stack react-native-safe-area-context react-native-screens
npm install @tanstack/react-query axios
npm install @react-native-async-storage/async-storage
npm install react-native-gesture-handler
npm install react-native-vector-icons
npm install react-native-webview
npm install react-native-push-notification
```

4. Configure iOS dependencies:
```bash
cd ios && pod install && cd ..
```

### Backend Integration

Create a `src/config/api.ts` file:

```typescript
export const API_CONFIG = {
  baseUrl: 'https://api.evokeexchange.com',
  wsUrl: 'wss://api.evokeexchange.com/ws',
  timeout: 30000,
  endpoints: {
    user: '/api/user',
    auth: '/api/auth',
    market: '/api/market/prices',
    devices: '/api/user/devices',
  }
};
```

### App Structure

```
src/
├── api/             # API services and handlers
├── assets/          # Static assets (images, fonts)
├── components/      # Reusable UI components
├── config/          # Configuration files
├── contexts/        # React Context providers
├── hooks/           # Custom React hooks
├── navigation/      # Navigation configuration
├── screens/         # Screen components
│   ├── auth/        # Authentication screens
│   ├── market/      # Market and trading screens
│   ├── profile/     # User profile screens
│   └── settings/    # App settings screens
├── services/        # Business logic services
├── store/           # State management
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

### Development Workflow

1. Run the development server:
```bash
npm start
```

2. Run on iOS simulator:
```bash
npm run ios
```

3. Run on Android emulator:
```bash
npm run android
```

## Key Features to Implement

1. Authentication flow (login, registration, password reset)
2. Market data display
3. Trading functionality
4. User profile management
5. Push notifications
6. Secure storage for sensitive data
7. Biometric authentication

## Integration with Web Backend

Ensure the mobile app uses the same API endpoints as the web application. The server is already configured to accept mobile app requests, but add the appropriate headers for requests:

```typescript
// Example of API request with mobile app headers
const headers = {
  'Content-Type': 'application/json',
  'X-Platform': 'mobile',
  'X-App-Version': '1.0.0',
  'X-Device-OS': Platform.OS,
  'X-Device-Model': DeviceInfo.getModel(),
}
```

## Testing

Run tests with:
```bash
npm test
```

## Building for Production

### iOS
```bash
npm run build:ios
```

### Android
```bash
npm run build:android
```