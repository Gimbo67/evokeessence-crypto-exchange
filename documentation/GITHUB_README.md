# EvokeEssence Exchange Platform

A sophisticated enterprise-grade cryptocurrency exchange platform for EvokeEssence s.r.o, featuring advanced referral systems, secure multi-role authentication, and native mobile applications.

## Repository Structure

This repository contains both the web application and mobile application code for the EvokeEssence Exchange platform.

### Web Application (`/`)

The web application is built with:
- React with TypeScript for the frontend
- Express.js for the backend API
- PostgreSQL with Drizzle ORM for data storage
- WebSockets for real-time data
- Comprehensive security features

### Mobile Application (`/mobile`)

The mobile app is built with React Native and connects to the same backend API as the web application, providing a native experience for iOS and Android users.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- iOS/Android development tools (for mobile app)

### Web Application Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables by creating a `.env` file

3. Run database migrations:
```bash
npm run db:push
```

4. Start the development server:
```bash
npm run dev
```

### Mobile Application Setup

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. For iOS, install CocoaPods:
```bash
cd ios && pod install && cd ..
```

4. Start the mobile app:
```bash
# For iOS
npm run ios

# For Android
npm run android
```

## Key Features

- Cryptocurrency trading with support for Bitcoin, Ethereum, USDT, and USDC
- KYC verification with SumSub WebSDK
- Multi-user role system (Client, Admin, Employee, Contractor)
- Contractor referral tracking with commission management
- Push notifications for real-time alerts
- Native mobile apps for iOS and Android
- Comprehensive security features and admin tools
- Multilingual support (i18n)

## Documentation

Additional documentation can be found in the following locations:
- [API Documentation](docs/API.md)
- [Mobile App Integration Guide](mobile/README.md)
- [Security Implementation](docs/SECURITY.md)
- [Contributor Guidelines](CONTRIBUTING.md)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.