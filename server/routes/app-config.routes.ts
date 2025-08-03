import express, { Request, Response } from "express";

/**
 * App Configuration API Routes
 * 
 * These routes provide publicly available configuration data for mobile apps.
 */

const router = express.Router();

// Main configuration endpoint
router.get('/', (req: Request, res: Response) => {
  // Get the host dynamically from the request
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol || 'http';
  
  // Detect if user agent is iOS app
  const userAgent = req.headers['user-agent'] || '';
  const isIosApp = userAgent.includes('EvokeExchange-iOS-App');
  
  const config = {
    success: true,
    data: {
      app: {
        version: "1.0.0",
        minSupportedVersion: "1.0.0",
        latestVersion: "1.0.0",
        forceUpdate: false,
        platforms: {
          ios: {
            version: "1.0.0",
            minVersion: "1.0.0",
            storeUrl: "https://apps.apple.com/app/evokeexchange/id123456789",
            appScheme: "evokeexchange://",
            forceUpdate: false,
            universalLinkDomain: "app.evokeexchange.com"
          },
          android: {
            version: "1.0.0",
            minVersion: "1.0.0",
            storeUrl: "https://play.google.com/store/apps/details?id=com.evokeexchange.app",
            forceUpdate: false
          }
        }
      },
      api: {
        baseUrl: process.env.NODE_ENV === 'production' 
          ? "https://api.evokeexchange.com" 
          : `${protocol}://${host}`,
        wsUrl: process.env.NODE_ENV === 'production'
          ? "wss://api.evokeexchange.com/ws"
          : `ws${protocol === 'https' ? 's' : ''}://${host}/ws`,
        version: "v1",
        timeout: 30000, // 30 seconds
        endpoints: {
          user: "/api/user",
          auth: "/api/auth",
          devices: "/api/user/devices",
          market: "/api/market",
          deposits: "/api/deposits",
          transactions: "/api/transactions",
          usdt: "/api/usdt",
          settings: "/api/settings",
          config: "/api/app-config"
        }
      },
      security: {
        deviceRegistrationRequired: true,
        sessionIdleTimeout: 1800, // 30 minutes in seconds
        sessionAbsoluteTimeout: 86400, // 24 hours in seconds
        maxSessionsPerUser: 5,
        maxDevicesPerUser: 5,
        passwordRequirements: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true
        }
      },
      features: {
        twoFactorAuth: {
          enabled: true,
          required: false,
          methods: ["authenticator", "email"]
        },
        websocketSupport: {
          enabled: true,
          events: ["balanceUpdated", "orderStatusChanged", "kycStatusChanged", "depositStatusChanged", "serverNotification"],
          pingInterval: 30000 // 30 seconds
        },
        currencies: {
          fiat: ["EUR", "USD", "CZK"],
          crypto: ["USDC", "USDT", "BTC", "ETH"]
        },
        kyc: {
          enabled: true,
          provider: "sumsub"
        }
      },
      ui: {
        theme: {
          primaryColor: "#007bff",
          backgroundColor: "#ffffff",
          textColor: "#333333",
          successColor: "#28a745",
          errorColor: "#dc3545",
          warningColor: "#ffc107"
        },
        logo: {
          light: `${protocol}://${host}/assets/logo-light.png`,
          dark: `${protocol}://${host}/assets/logo-dark.png` 
        },
        screens: {
          login: {
            showRegistrationLink: true,
            showPasswordReset: true,
            showRememberMe: true
          },
          dashboard: {
            showBalanceGraph: true,
            showRecentTransactions: true,
            showKycStatus: true
          }
        }
      }
    }
  };
  
  // Send the configuration
  res.json(config);
});

export const registerAppConfigRoutes = (app: express.Express): void => {
  app.use('/api/app-config', router);
  console.log('App Configuration routes registered');
};

export default router;