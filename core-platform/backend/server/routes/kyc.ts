import { Router } from 'express';
import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { sumSubService } from '../services/sumsub';
import type { SumSubWebhookPayload } from '../services/sumsub';
import crypto from 'crypto';
import { telegramService } from '../services/telegram';

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

// Generate SumSub access token for WebSDK
router.post('/api/kyc/sumsub/token', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id?.toString();
    const userEmail = req.user?.email;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!sumSubService.isConfigured()) {
      return res.status(503).json({ 
        message: "SumSub service not configured. Please contact support." 
      });
    }

    console.log('[SumSub] Generating access token for user:', {
      userId,
      userEmail: userEmail || 'not provided',
      timestamp: new Date().toISOString()
    });

    const tokenData = await sumSubService.generateAccessToken(userId, userEmail);
    
    res.json({
      success: true,
      token: tokenData.token,
      userId: tokenData.userId,
      ttl: tokenData.ttl
    });
  } catch (error: any) {
    console.error('[SumSub] Error generating access token:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      message: "Failed to generate access token",
      error: error.message
    });
  }
});

// SumSub webhook endpoint
router.post('/api/kyc/sumsub/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-payload-digest'] as string;
    const payload = JSON.stringify(req.body);

    console.log('[SumSub Webhook] Received webhook:', {
      signature: signature ? 'present' : 'missing',
      payloadLength: payload.length,
      timestamp: new Date().toISOString()
    });

    // Verify webhook signature
    if (!sumSubService.verifyWebhookSignature(payload, signature)) {
      console.warn('[SumSub Webhook] Invalid signature');
      return res.status(401).json({ message: "Invalid signature" });
    }

    const webhookData: SumSubWebhookPayload = req.body;
    
    console.log('[SumSub Webhook] Processing webhook data:', {
      type: webhookData.type,
      applicantId: webhookData.applicantId,
      externalUserId: webhookData.externalUserId,
      reviewStatus: webhookData.reviewStatus,
      reviewResult: webhookData.reviewResult?.reviewAnswer,
      timestamp: new Date().toISOString()
    });

    // Find user by external user ID
    // SumSub external user ID format: uni-{username}-{hash}
    // Extract username from the external user ID
    let user;
    const externalUserId = webhookData.externalUserId;
    
    if (externalUserId.includes('-')) {
      // Parse SumSub format: uni-{username}-{hash}
      const parts = externalUserId.split('-');
      if (parts.length >= 2 && parts[0] === 'uni') {
        const username = parts[1];
        console.log('[SumSub Webhook] Extracted username from external ID:', { 
          externalUserId, 
          username,
          timestamp: new Date().toISOString()
        });
        
        user = await db.query.users.findFirst({
          where: eq(users.username, username)
        });
      }
    }
    
    // Fallback: try to parse as direct user ID
    if (!user && !isNaN(parseInt(externalUserId))) {
      user = await db.query.users.findFirst({
        where: eq(users.id, parseInt(externalUserId))
      });
    }

    if (!user) {
      console.error('[SumSub Webhook] User not found:', webhookData.externalUserId);
      return res.status(404).json({ message: "User not found" });
    }

    // Update user's SumSub data
    const updateData: any = {
      sumsub_applicant_id: webhookData.applicantId,
      sumsub_inspection_id: webhookData.inspectionId,
      sumsub_review_status: webhookData.reviewStatus,
      updated_at: new Date()
    };

    if (webhookData.reviewResult) {
      updateData.sumsub_review_result = webhookData.reviewResult.reviewAnswer;
    }

    // Determine KYC status based on SumSub result and webhook type
    let newKycStatus = user.kyc_status;
    
    // Handle different webhook types
    switch (webhookData.type) {
      case 'applicantReviewed':
      case 'applicantWorkflowCompleted':
        if (webhookData.reviewStatus === 'completed' && webhookData.reviewResult) {
          if (user.manual_override_enabled) {
            // Manual override enabled - only auto-approve GREEN results
            if (webhookData.reviewResult.reviewAnswer === 'GREEN') {
              newKycStatus = 'approved';
            } else if (webhookData.reviewResult.reviewAnswer === 'RED') {
              newKycStatus = 'rejected';
            } else if (webhookData.reviewResult.reviewAnswer === 'YELLOW') {
              newKycStatus = 'pending'; // Keep pending for manual review
            }
          } else {
            // Auto-approval - use SumSub result directly
            newKycStatus = sumSubService.mapSumSubStatusToKycStatus(
              webhookData.reviewResult.reviewAnswer || '',
              webhookData.reviewStatus
            );
          }
        }
        break;
      
      case 'applicantPending':
        newKycStatus = 'pending';
        break;
      
      case 'applicantOnHold':
        newKycStatus = 'pending';
        break;
      
      case 'applicantWorkflowFailed':
        newKycStatus = 'rejected';
        break;
      
      case 'applicantActionPending':
        // Additional actions required - keep as pending
        newKycStatus = 'pending';
        break;
      
      case 'applicantActionReviewed':
        // Handle action review results
        if (webhookData.reviewResult?.reviewAnswer === 'GREEN') {
          newKycStatus = 'approved';
        } else if (webhookData.reviewResult?.reviewAnswer === 'RED') {
          newKycStatus = 'rejected';
        } else {
          newKycStatus = 'pending';
        }
        break;
      
      default:
        // For other webhook types, don't change the status
        console.log('[SumSub Webhook] Unhandled webhook type:', webhookData.type);
        break;
    }

    if (newKycStatus !== user.kyc_status) {
      updateData.kyc_status = newKycStatus;
      
      console.log('[SumSub Webhook] KYC status updated:', {
        userId: user.id,
        oldStatus: user.kyc_status,
        newStatus: newKycStatus,
        sumsubResult: webhookData.reviewResult?.reviewAnswer,
        manualOverride: user.manual_override_enabled,
        timestamp: new Date().toISOString()
      });
    }

    // Update user record
    await db.update(users)
      .set(updateData)
      .where(eq(users.id, user.id));

    console.log('[SumSub Webhook] User updated successfully:', {
      userId: user.id,
      kycStatus: newKycStatus,
      timestamp: new Date().toISOString()
    });

    // Send Telegram notification for KYC status changes (only for approved/rejected)
    if (newKycStatus !== user.kyc_status && (newKycStatus === 'approved' || newKycStatus === 'rejected')) {
      try {
        console.log('[SumSub Webhook] Sending Telegram notification for KYC status change:', {
          userId: user.id,
          username: user.username,
          newStatus: newKycStatus
        });
        
        const telegramMessage = telegramService.formatKycVerification(
          user.username,
          user.full_name || user.username,
          newKycStatus
        );
        
        await telegramService.sendRegistrationNotification(telegramMessage);
        console.log('[SumSub Webhook] Telegram KYC notification sent successfully');
      } catch (telegramError) {
        console.error('[SumSub Webhook] Error sending Telegram KYC notification:', telegramError);
        // Don't fail the webhook if Telegram fails, just log the error
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('[SumSub Webhook] Error processing webhook:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      message: "Failed to process webhook",
      error: error.message
    });
  }
});

// Admin endpoint to toggle manual override for a user
router.post('/api/kyc/manual-override/:userId', requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const targetUserId = parseInt(req.params.userId);
    const { enabled, reason } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: "enabled field must be boolean" });
    }

    const updateData: any = {
      manual_override_enabled: enabled,
      manual_override_by: req.user.id,
      manual_override_at: new Date(),
      updated_at: new Date()
    };

    if (reason) {
      updateData.manual_override_reason = reason;
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, targetUserId));

    console.log('[KYC Manual Override] Override toggled:', {
      targetUserId,
      enabled,
      reason,
      adminId: req.user.id,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[KYC Manual Override] Error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      message: "Failed to update manual override",
      error: error.message
    });
  }
});

// Admin endpoint to manually approve/reject KYC
router.post('/api/kyc/manual-decision/:userId', requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const targetUserId = parseInt(req.params.userId);
    const { status, reason } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updateData: any = {
      kyc_status: status,
      manual_override_by: req.user.id,
      manual_override_at: new Date(),
      updated_at: new Date()
    };

    if (reason) {
      updateData.manual_override_reason = reason;
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, targetUserId));

    console.log('[KYC Manual Decision] Status updated:', {
      targetUserId,
      status,
      reason,
      adminId: req.user.id,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[KYC Manual Decision] Error:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      message: "Failed to update KYC status",
      error: error.message
    });
  }
});

export default router;