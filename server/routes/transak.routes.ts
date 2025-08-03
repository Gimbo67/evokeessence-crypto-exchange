import type { Express } from "express";
import express from 'express';
import { requireAuthentication } from '../middleware/auth';

const router = express.Router();

/**
 * Generate a Transak widget URL for the current user
 * This endpoint creates a personalized URL with pre-filled user information
 */
router.get('/widget-url', requireAuthentication, async (req, res) => {
  try {
    const { user } = req;
    
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get Transak API key from environment
    const transakApiKey = process.env.TRANSAK_API_KEY || ''; // Production key should be set in env
    const environment = process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'STAGING';
    
    // For development/testing, use staging environment
    const baseUrl = environment === 'PRODUCTION' 
      ? 'https://global.transak.com/' 
      : 'https://global-stg.transak.com/';
    
    // Base parameters
    const params = {
      apiKey: transakApiKey,
      environment, // STAGING or PRODUCTION
      themeColor: '000000', // Primary color in hex without '#'
      hostURL: process.env.HOST_URL || 'https://evokeessence.com', // Replace with your website URL
      widgetHeight: '700px',
      widgetWidth: '500px',
      defaultCryptoCurrency: 'ETH', // Default crypto currency
      defaultFiatAmount: '500', // Default fiat amount
      disableWalletAddressForm: 'true', // Hide wallet address form by default
      email: user.email || '',
      userData: {
        firstName: user.full_name?.split(' ')[0] || '',
        lastName: user.full_name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
        mobileNumber: user.phone_number || '',
        dob: '', // Date format: YYYY-MM-DD
        address: {
          addressLine1: user.address || '',
          city: '',
          country: user.country_of_residence || '',
          postCode: '',
          state: ''
        }
      }
    };

    // Type definitions for param processing
    interface ParamMap {
      [key: string]: string | number | boolean | Record<string, unknown>;
    }

    // Convert to URL parameter string
    const queryString = Object.entries(params as ParamMap)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
        // Handle nested userData object
        if (key === 'userData' && typeof value === 'object') {
          return `userData=${encodeURIComponent(JSON.stringify(value))}`;  
        }
        // Convert all other values to string
        return `${key}=${encodeURIComponent(String(value))}`;
      })
      .join('&');

    // Construct the full URL
    const widgetUrl = `${baseUrl}?${queryString}`;

    res.json({ url: widgetUrl });
  } catch (error) {
    console.error('Error generating Transak widget URL:', error);
    res.status(500).json({ error: 'Failed to generate Transak widget URL' });
  }
});

/**
 * Register Transak routes for the application
 */
export function registerTransakRoutes(app: Express): void {
  console.log('Registering Transak API routes...');
  app.use('/api/transak', router);
  console.log('Transak API routes registered successfully');
}

export default router;
