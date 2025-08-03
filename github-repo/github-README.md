# EvokeEssence Cryptocurrency Exchange Platform

A sophisticated enterprise-grade cryptocurrency exchange platform for EvokeEssence s.r.o, delivering advanced digital asset management with comprehensive security workflows and multilingual user-centric verification processes.

## Core Features

- **Cryptocurrency Trading**: Support for Bitcoin, Ethereum, USDT, and USDC with secure transaction processing
- **KYC Identity Verification**: Integration with SumSub WebSDK for compliant user onboarding
- **Solana Blockchain Integration**: Purchase USDC on the Solana network directly within the platform
- **Multi-User Role System**: Client, Admin, and Employee portals with appropriate permissions
- **Push Notification System**: Real-time alerts for transactions and account activities for iOS app
- **Security-First Architecture**: Robust authentication, CSP headers, and comprehensive admin tools
- **Comprehensive Backup System**: Automated database backups to ensure data integrity
- **Contractor Referral System**: Advanced referral tracking and commission management
- **Multilingual Support**: Full i18n integration for global accessibility

## Technical Architecture

### Frontend
- React with TypeScript
- Tailwind CSS with Shadcn UI components
- React Query for data fetching
- React Hook Form for form validation
- Wouter for routing
- Multilingual support via context

### Backend
- Express.js API server
- PostgreSQL database with Drizzle ORM
- API-driven architecture with secure endpoints
- WebSocket support for real-time updates
- Role-based access control system

### Mobile App Integration
- iOS and Android support via native APIs
- Push notification system
- Secure authentication

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm/yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-organization/evokeessence-exchange.git
cd evokeessence-exchange
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables by creating a `.env` file with the following variables:
```
DATABASE_URL=postgresql://username:password@localhost:5432/evokeessence_db
SESSION_SECRET=your_session_secret
RECAPTCHA_SITE_KEY=your_recaptcha_site_key
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key
```

4. Run database migrations
```bash
npm run db:push
```

5. Start the development server
```bash
npm run dev
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.