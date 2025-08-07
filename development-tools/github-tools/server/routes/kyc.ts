import { Router } from 'express';
import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Authentication check middleware with detailed logging
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    console.log('[KYC] Authentication failed:', {
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
};

// KYC status schema for validation
const kycStatusSchema = z.object({
  status: z.enum(['not_started', 'pending', 'approved', 'rejected']),
  full_name: z.string().optional(),
  email: z.string().email().optional()
});

// Route to get KYC status with enhanced error handling and logging
router.get('/api/kyc/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id?.toString();

    if (!userId) {
      console.error('[KYC] Missing user ID in authenticated request');
      return res.status(400).json({ message: "User ID is required" });
    }

    console.log('[KYC] Fetching status for user:', {
      userId,
      timestamp: new Date().toISOString()
    });

    // Get user details from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, parseInt(userId))
    });

    if (!user) {
      console.error('[KYC] User not found:', { userId });
      return res.status(404).json({ message: "User not found" });
    }

    const response = {
      status: user.kyc_status || 'not_started',
      full_name: user.full_name,
      email: user.email
    };

    // Validate response against schema
    const validationResult = kycStatusSchema.safeParse(response);
    if (!validationResult.success) {
      console.error('[KYC] Invalid status data:', {
        userId,
        errors: validationResult.error.errors,
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({
        message: "Invalid KYC status data",
        errors: validationResult.error.errors
      });
    }

    console.log('[KYC] Successfully fetched status:', {
      userId,
      status: response.status,
      timestamp: new Date().toISOString()
    });

    return res.json(validationResult.data);
  } catch (error: any) {
    console.error('[KYC] Error getting KYC status:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({
      message: "Failed to get KYC status",
      error: error.message
    });
  }
});

export default router;