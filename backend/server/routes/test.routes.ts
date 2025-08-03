import express, { Request, Response } from 'express';
import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { generateRandomCodes } from '../utils/2fa-utils';

/**
 * This file contains test routes to verify 2FA functionality
 * They bypass normal authentication to allow easier testing
 */

const router = express.Router();

// Get 2FA status for test
router.get('/test-api/2fa/status', async (req: Request, res: Response) => {
  try {
    // Ensure this is properly set for JSON
    res.setHeader('Content-Type', 'application/json');
    
    // For testing - use a fixed user
    const user = await db.query.users.findFirst({
      where: eq(users.is_admin, true),
    });

    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        error: "No admin user found" 
      });
    }

    // Calculate number of backup codes
    let backupCodesCount = 0;
    if (user.two_factor_backup_codes) {
      try {
        const backupCodes = JSON.parse(user.two_factor_backup_codes as string);
        backupCodesCount = backupCodes.length;
      } catch (err) {
        console.error("Error parsing backup codes:", err);
      }
    }

    console.log(`Test 2FA Status for user ${user.id}: enabled=${user.two_factor_enabled}, method=${user.two_factor_method}`);
    
    return res.status(200).json({
      status: 'success',
      enabled: user.two_factor_enabled || false,
      method: user.two_factor_method || null,
      backupCodesCount,
      userId: user.id
    });
  } catch (error) {
    console.error("Error getting test 2FA status:", error);
    return res.status(500).json({ 
      status: 'error',
      error: "Failed to get 2FA status" 
    });
  }
});

// Test setup 2FA
router.post('/test-api/2fa/setup', async (req: Request, res: Response) => {
  try {
    // Ensure this is properly set for JSON
    res.setHeader('Content-Type', 'application/json');
    
    // For testing - use a fixed user
    const user = await db.query.users.findFirst({
      where: eq(users.is_admin, true),
    });

    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        error: "No admin user found" 
      });
    }

    console.log(`Test 2FA Setup requested for user: ${user.id}`);

    // Generate a new secret
    const secret = speakeasy.generateSecret({
      name: `EvokeEssence:${user.email || user.username}`,
      length: 20,
    });

    // Generate QR code
    const qrCode = await QRCode.toString(secret.otpauth_url || "", {
      type: 'svg',
      width: 200,
    });

    // Store the secret temporarily (not activating yet)
    await db.update(users)
      .set({ 
        two_factor_secret: secret.base32,
        two_factor_enabled: false,
        two_factor_method: 'app'
      })
      .where(eq(users.id, user.id));

    console.log(`Test 2FA secret generated for user: ${user.id}`);
    
    // Return the secret and QR code to the client
    return res.status(200).json({
      status: 'success',
      secret: secret.base32,
      qrCode,
      userId: user.id
    });
  } catch (error) {
    console.error("Error setting up test 2FA:", error);
    return res.status(500).json({ 
      status: 'error',
      error: "Failed to set up 2FA" 
    });
  }
});

// Test validate 2FA token
router.post('/test-api/2fa/validate', async (req: Request, res: Response) => {
  try {
    // Ensure this is properly set for JSON
    res.setHeader('Content-Type', 'application/json');
    
    const { token } = req.body;
    
    if (!token || token.length !== 6) {
      return res.status(400).json({ 
        status: 'error',
        error: "Invalid verification code format" 
      });
    }
    
    // For testing - use a fixed user
    const user = await db.query.users.findFirst({
      where: eq(users.is_admin, true),
    });

    if (!user) {
      return res.status(404).json({ 
        status: 'error',
        error: "No admin user found" 
      });
    }
    
    if (!user.two_factor_secret) {
      return res.status(400).json({ 
        status: 'error',
        error: "2FA not set up for this user" 
      });
    }

    // Verify the token
    const isValid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token,
      window: 1 // Allow 30 seconds of leeway
    });

    if (!isValid) {
      return res.status(400).json({ 
        status: 'error',
        error: "Invalid verification code" 
      });
    }

    // Generate backup codes
    const backupCodes = generateRandomCodes(8); // 8 backup codes

    // Activate 2FA
    await db.update(users)
      .set({ 
        two_factor_enabled: true,
        two_factor_backup_codes: JSON.stringify(backupCodes)
      })
      .where(eq(users.id, user.id));

    console.log(`Test 2FA successfully activated for user: ${user.id}`);
    
    return res.status(200).json({
      status: 'success',
      backupCodes,
      message: "Two-factor authentication successfully enabled"
    });
  } catch (error) {
    console.error("Error verifying test 2FA:", error);
    return res.status(500).json({ 
      status: 'error',
      error: "Failed to verify 2FA" 
    });
  }
});

export default router;