# EvokeEssence Exchange Mobile App

A native iOS mobile application for the EvokeEssence cryptocurrency exchange platform, built with React Native and Expo.

## Features

- **User Authentication**: Secure login, registration, and password recovery
- **Market Data**: Real-time cryptocurrency market information
- **Wallet Management**: View balances, deposit and withdraw funds
- **Trading Interface**: Buy and sell cryptocurrencies with a simple interface
- **Profile Management**: User settings, preferences, and account information
- **Contractor Dashboard**: Referral tracking and commission management for contractors

## Technology Stack

- **React Native**: Core mobile framework
- **Expo**: Development toolchain
- **React Navigation**: Navigation management
- **Expo Secure Store**: Secure local storage
- **Axios**: API communication
- **TypeScript**: Type-safe development

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/evokeessence-app.git
   cd evokeessence-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Follow the instructions in the terminal to open the app in:
   - iOS simulator (requires macOS and Xcode)
   - Physical device using Expo Go app

## Project Structure

```
evokeessence-app/
├── src/
│   ├── assets/            # Images, fonts, and other static files
│   ├── components/        # Reusable UI components
│   ├── context/           # React Context for state management
│   ├── navigation/        # Navigation configuration
│   ├── screens/           # Application screens
│   │   ├── auth/          # Authentication-related screens
│   │   └── main/          # Main app screens
│   ├── services/          # API services and data fetching
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── App.tsx                # Main application component
└── app.json               # Expo configuration
```

## API Integration

The mobile app connects to the same backend API as the EvokeEssence web platform. To configure the API endpoint:

1. Update the API_URL variable in `src/services/authService.ts` to point to your backend server.

## Security Features

- Secure storage of authentication tokens
- Biometric authentication option
- Session management
- Input validation

## Build and Deploy

To build for production:

```bash
expo build:ios
```

This will start the build process for iOS. Follow the prompts to configure your Apple Developer account and certificates.

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.