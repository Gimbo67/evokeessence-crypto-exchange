# EvokeEssence Cryptocurrency Exchange Platform

## Overview
EvokeEssence is an enterprise-grade cryptocurrency exchange platform offering secure digital asset management with comprehensive security workflows, multilingual support, and both web and mobile applications. Its vision is to provide a robust, user-friendly, and compliant platform for cryptocurrency trading and management, serving individual clients, employees, and contractors. Key capabilities include cryptocurrency trading (Bitcoin, Ethereum, USDT, USDC), KYC verification, SEPA deposits, Solana USDC purchasing, and an advanced referral system. The platform is designed for scalability and high security, aiming for a leading position in the digital asset exchange market.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Architecture
The platform utilizes a modern full-stack architecture with clear separation between frontend, backend, and mobile applications.
- **Frontend**: React with TypeScript for a responsive web interface.
- **Backend**: Express.js API server.
- **Mobile**: React Native applications for iOS and Android.
- **Database**: PostgreSQL with Drizzle ORM for type-safe operations.

### Technology Stack Rationale
- **React + TypeScript**: Chosen for type safety and developer experience.
- **Express.js**: Selected for simplicity and extensive middleware ecosystem.
- **PostgreSQL**: Provides ACID compliance for financial transactions.
- **Drizzle ORM**: Offers type-safe database operations.
- **React Native**: Enables code sharing between iOS and Android.

### Key Components
- **Authentication & Security**: Multi-role system (Client, Admin, Employee, Contractor), TOTP-based 2FA, production-grade CSP headers (A+ rating), IP-based rate limiting with progressive ban, and reCAPTCHA integration.
- **Core Business Features**: Cryptocurrency trading (BTC, ETH, USDT, USDC), SumSub WebSDK for KYC with manual override, SEPA deposits, direct USDC purchasing on Solana, and advanced contractor referral system.
- **User Interface**: Shadcn UI components, Tailwind CSS for styling, full i18n support (English, German, Czech), and responsive mobile-first design.
- **Admin & Management**: Comprehensive admin dashboard for user, transaction, and security management; employee portal for KYC and customer support; contractor management for referral tracking and commissions; and complete audit logging.

### System Design Choices
- **Data Flow**: Structured processes for user registration, authentication, transaction processing (including admin review and real-time notifications), and the referral system with automated commission distribution.
- **Deployment Strategy**: Supports multiple environments (development, production) with environment-aware configurations. Includes database migration management (Drizzle Kit), automated backups, connection pooling, secret management via environment variables, and SSL/TLS enforcement. Mobile apps are deployed via iOS App Store and Android Play Store, utilizing platform-specific push notifications. The system is designed for horizontal scaling using containerization (Docker).

## External Dependencies

### Financial & Compliance
- **SumSub WebSDK**: For KYC verification, including webhooks for status updates.
- **SEPA banking**: For European fiat payment processing.
- **Solana RPC**: For blockchain interactions related to USDC transactions.

### Communication & Notifications
- **Apple Push Notification Service**: For iOS notifications.
- **WebSocket connections**: For real-time web client updates.
- **Email services**: For transaction confirmations and security alerts.
- **Telegram Bot API**: For user registration, transaction, and group-based referral notifications.

### Security & Verification
- **Google reCAPTCHA**: For bot protection on authentication endpoints.
- **IP geolocation**: For security monitoring and fraud detection.
- **Cryptographic libraries**: For secure password hashing and 2FA token generation.

### Development & Monitoring
- **Vite**: Development server.
- **TypeScript compiler**: For type checking and transpilation.
- **Drizzle Kit**: For database migration and schema management.