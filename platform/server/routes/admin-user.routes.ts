import express, { Request, Response, NextFunction } from 'express';
import { db } from '@db';
import { and, eq } from 'drizzle-orm';
import {
  users,
  sepaDeposits,
  usdtOrders,
  usdcOrders,
  kycDocuments,
  chatHistory,
  userPermissions
} from '@db/schema';
import { requireAuthentication } from '../middleware/auth';
import { requireAdminAccess } from '../middleware/admin';
import { generateUserDataExportPDF } from '../../client/src/utils/pdf-generator';

export const adminUserRouter = express.Router();

// Add middleware to force JSON content type for all admin user routes
adminUserRouter.use((req: Request, res: Response, next: NextFunction) => {
  // Set appropriate headers to ensure JSON response
  res.setHeader('Content-Type', 'application/json');
  
  // Log the request for debugging purposes
  console.log('[Admin User API Request]', {
    method: req.method,
    path: req.path,
    fullPath: req.originalUrl,
    headers: {
      'content-type': req.headers['content-type'],
      'accept': req.headers.accept,
      'x-requested-with': req.headers['x-requested-with']
    }
  });
  
  // Override res.send to prevent HTML responses
  const originalSend = res.send;
  res.send = function(body) {
    if (typeof body === 'string' && body.includes('<!DOCTYPE html>')) {
      console.error('[Admin User API] Preventing HTML response, converting to JSON');
      return res.status(500).json({
        success: false,
        error: "Server error",
        message: "An unexpected error occurred. Please try again."
      });
    }
    return originalSend.call(this, body);
  };
  
  next();
});

/**
 * @route GET /api/admin/users/:userId/export
 * @desc Export all user data for GDPR compliance
 * @access Admin only
 */
adminUserRouter.get(
  '/:userId/export',
  requireAuthentication,
  requireAdminAccess,
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      // Fetch user data
      const userData = await db.query.users.findFirst({
        where: eq(users.id, userId),
        with: {
          kycDocuments: true,
          chatHistory: true,
          permissions: true
        }
      });

      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Fetch user's transactions (SEPA deposits, USDT and USDC orders)
      const userDeposits = await db.query.sepaDeposits.findMany({
        where: eq(sepaDeposits.userId, userId)
      });

      const userUsdtOrders = await db.query.usdtOrders.findMany({
        where: eq(usdtOrders.userId, userId)
      });

      const userUsdcOrders = await db.query.usdcOrders.findMany({
        where: eq(usdcOrders.userId, userId)
      });

      // Combine all transaction types
      const transactions = [
        ...userDeposits.map(d => ({
          id: d.id,
          type: 'deposit',
          amount: d.amount,
          currency: d.currency,
          status: d.status,
          createdAt: d.createdAt,
          completedAt: d.completedAt,
          reference: d.reference,
          commissionFee: d.commissionFee
        })),
        ...userUsdtOrders.map(o => ({
          id: o.id,
          type: 'usdt',
          amount: o.amountUsdt,
          originalAmount: o.amountUsd,
          currency: 'USDT',
          status: o.status,
          createdAt: o.createdAt,
          completedAt: o.completedAt,
          txHash: o.txHash,
          exchangeRate: o.exchangeRate
        })),
        ...userUsdcOrders.map(o => ({
          id: o.id,
          type: 'usdc',
          amount: o.amountUsdc,
          originalAmount: o.amountUsd,
          currency: 'USDC',
          status: o.status,
          createdAt: o.createdAt,
          completedAt: o.completedAt,
          txHash: o.txHash,
          exchangeRate: o.exchangeRate
        }))
      ];

      // Compile complete user data
      const exportData = {
        user: {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          fullName: userData.fullName,
          phoneNumber: userData.phoneNumber,
          address: userData.address,
          countryOfResidence: userData.countryOfResidence,
          gender: userData.gender,
          kycStatus: userData.kyc_status,
          createdAt: userData.createdAt,
          lastLoginAt: userData.lastLoginAt,
          profileUpdated: userData.profileUpdated,
          balances: [
            {
              amount: userData.balance,
              currency: userData.balanceCurrency || 'EUR'
            }
          ]
        },
        kycDocuments: userData.kycDocuments,
        transactions,
        chatHistory: userData.chatHistory,
        permissions: userData.permissions
      };

      return res.status(200).json({
        success: true,
        message: 'User data exported successfully',
        data: exportData
      });
    } catch (error) {
      console.error('Error exporting user data:', error);
      return res.status(500).json({ 
        error: 'Failed to export user data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @route DELETE /api/admin/users/:userId
 * @desc Delete a user and all associated data
 * @access Admin only
 */
adminUserRouter.delete(
  '/:userId',
  requireAuthentication,
  requireAdminAccess,
  async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      // Start a transaction to ensure data consistency
      await db.transaction(async (tx) => {
        // Delete related records first
        await tx.delete(kycDocuments).where(eq(kycDocuments.userId, userId));
        await tx.delete(chatHistory).where(eq(chatHistory.userId, userId));
        await tx.delete(sepaDeposits).where(eq(sepaDeposits.userId, userId));
        await tx.delete(usdtOrders).where(eq(usdtOrders.userId, userId));
        await tx.delete(usdcOrders).where(eq(usdcOrders.userId, userId));
        await tx.delete(userPermissions).where(eq(userPermissions.userId, userId));
        
        // Finally, delete the user
        await tx.delete(users).where(eq(users.id, userId));
      });

      return res.status(200).json({
        success: true,
        message: 'User and all associated data deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ 
        error: 'Failed to delete user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);