import express, { Request, Response } from 'express';
import { db } from '@db/index';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { verify } from 'speakeasy';
import { requireAuthentication, requireAdminAccess } from '../middleware/auth';

export const adminTwoFactorRouter = express.Router();

/**
 * @route GET /api/admin/2fa/status/:userId
 * @desc Check the 2FA status of a specific user
 * @access Admin only
 */
adminTwoFactorRouter.get('/status/:userId', requireAuthentication, requireAdminAccess, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    if (!userRecord) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.json({ 
      hasEnabled2FA: !!userRecord.two_factor_enabled,
      userId: userRecord.id,
      username: userRecord.username
    });
  } catch (error) {
    console.error('Error checking user 2FA status:', error);
    return res.status(500).json({ message: 'Failed to check user 2FA status' });
  }
});

/**
 * @route POST /api/admin/2fa/disable/:userId
 * @desc Disable 2FA for a specific user
 * @access Admin only
 */
adminTwoFactorRouter.post('/disable/:userId', requireAuthentication, requireAdminAccess, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.id;
    const userId = parseInt(req.params.userId, 10);
    const { confirmationCode } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Get the user record
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    if (!userRecord) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if 2FA is already disabled
    if (!userRecord.two_factor_enabled) {
      return res.json({ 
        message: '2FA is already disabled for this user',
        success: true 
      });
    }
    
    // Get the admin record to verify their 2FA if required
    const adminRecord = await db.query.users.findFirst({
      where: eq(users.id, adminId),
    });
    
    if (!adminRecord) {
      return res.status(403).json({ message: 'Admin user not found' });
    }
    
    // If admin has 2FA enabled, require confirmation code
    if (adminRecord.two_factor_enabled && adminRecord.two_factor_secret) {
      if (!confirmationCode) {
        return res.status(401).json({ 
          message: 'Admin verification required to disable user 2FA',
          requiresVerification: true
        });
      }
      
      // Verify the admin's 2FA code
      const isValidToken = verify({
        secret: adminRecord.two_factor_secret,
        encoding: 'base32',
        token: confirmationCode,
        window: 1 // Allow for some time drift
      });
      
      if (!isValidToken) {
        return res.status(401).json({ message: 'Invalid confirmation code' });
      }
    }
    
    // Disable 2FA for the user
    await db.update(users)
      .set({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_backup_codes: null,
        two_factor_method: null
      })
      .where(eq(users.id, userId));
    
    // Log the action
    console.log(`Admin ${adminId} disabled 2FA for user ${userId}`);
    
    return res.json({ 
      message: '2FA has been successfully disabled for the user',
      success: true 
    });
  } catch (error) {
    console.error('Error disabling user 2FA:', error);
    return res.status(500).json({ message: 'Failed to disable user 2FA' });
  }
});

export default adminTwoFactorRouter;