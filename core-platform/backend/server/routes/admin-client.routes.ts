import { Router, Request, Response } from 'express';
import { requireAdminAccess, requireAuthentication } from '../middleware/auth';
import { db } from '@db';
import { users, profileUpdateRequests, sepaDeposits, usdtOrders, usdcOrders } from '@db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';

export const adminClientRouter = Router();

/**
 * @route GET /api/admin/clients/:id
 * @desc Get detailed information about a specific client
 * @access Admin only
 */
adminClientRouter.get('/:id', requireAuthentication, requireAdminAccess, async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
    
    console.log(`Admin fetching client details for ID: ${clientId}`);
    
    // Get user data with profile update requests
    const user = await db.query.users.findFirst({
      where: eq(users.id, clientId),
      with: {
        profileUpdateRequests: {
          orderBy: [desc(profileUpdateRequests.createdAt)]
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: "Client not found" });
    }
    
    // Get transactions
    const sepa = await db.query.sepaDeposits.findMany({
      where: eq(sepaDeposits.userId, clientId),
      orderBy: [desc(sepaDeposits.createdAt)]
    });
    
    const usdt = await db.query.usdtOrders.findMany({
      where: eq(usdtOrders.userId, clientId),
      orderBy: [desc(usdtOrders.createdAt)]
    });
    
    const usdc = await db.query.usdcOrders.findMany({
      where: eq(usdcOrders.userId, clientId),
      orderBy: [desc(usdcOrders.createdAt)]
    });
    
    // Format transactions for consistency
    const transactions = [
      ...sepa.map(t => ({
        id: t.id,
        type: 'deposit',
        amount: parseFloat(t.amount?.toString() || '0'),
        currency: t.currency || 'EUR',
        status: t.status || 'pending',
        createdAt: t.createdAt?.toISOString() || new Date().toISOString(),
        completedAt: t.completedAt?.toISOString() || null,
        reference: t.reference || '',
        initialAmount: parseFloat(t.amount?.toString() || '0'),
        commissionAmount: parseFloat(t.commissionFee?.toString() || '0'),
        totalAmount: parseFloat((parseFloat(t.amount?.toString() || '0') - parseFloat(t.commissionFee?.toString() || '0')).toFixed(2))
      })),
      ...usdt.map(t => ({
        id: t.id,
        type: 'usdt',
        amount: parseFloat(t.amountUsdt?.toString() || '0'),
        currency: 'USDT',
        status: t.status || 'pending',
        createdAt: t.createdAt?.toISOString() || new Date().toISOString(),
        completedAt: t.completedAt?.toISOString() || null,
        txHash: t.txHash || ''
      })),
      ...usdc.map(t => ({
        id: t.id,
        type: 'usdc',
        amount: parseFloat(t.amountUsdc?.toString() || '0'),
        currency: 'USDC',
        status: t.status || 'pending',
        createdAt: t.createdAt?.toISOString() || new Date().toISOString(),
        completedAt: t.completedAt?.toISOString() || null,
        txHash: t.txHash || ''
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Format response
    const clientData = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      address: user.address,
      countryOfResidence: user.countryOfResidence,
      gender: user.gender,
      password: user.password,
      kycStatus: user.kyc_status,
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      balance: parseFloat(user.balance?.toString() || '0'),
      balanceCurrency: user.balanceCurrency,
      isAdmin: user.isAdmin,
      isEmployee: user.isEmployee,
      userGroup: user.userGroup,
      two_factor_enabled: user.two_factor_enabled,
      two_factor_method: user.two_factor_method,
      transactions: transactions,
      // Include formatted profile update requests
      profileUpdateRequests: user.profileUpdateRequests.map(request => ({
        id: request.id,
        userId: request.userId,
        status: request.status || 'pending',
        createdAt: request.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: request.updatedAt?.toISOString() || new Date().toISOString(),
        reviewedAt: request.reviewedAt?.toISOString() || null,
        reviewedBy: request.reviewedBy,
        adminComment: request.adminComment,
        // Include all fields that can be updated
        fullName: request.fullName,
        email: request.email,
        phoneNumber: request.phoneNumber,
        address: request.address,
        countryOfResidence: request.countryOfResidence,
        gender: request.gender
      }))
    };
    
    return res.json(clientData);
  } catch (error) {
    console.error('Error fetching client details:', error);
    return res.status(500).json({ message: 'Failed to fetch client details' });
  }
});

/**
 * @route PATCH /api/admin/clients/:id/kyc
 * @desc Update a client's KYC status
 * @access Admin only
 */
adminClientRouter.patch('/:id/kyc', requireAuthentication, requireAdminAccess, async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id);
    
    if (isNaN(clientId)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }
    
    // Validate request body
    const validationSchema = z.object({
      status: z.string().min(1)
    });
    
    const validationResult = validationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid status value",
        errors: validationResult.error.format()
      });
    }
    
    const { status } = validationResult.data;
    const adminId = req.user?.id;
    
    // Update the user's KYC status
    await db.update(users)
      .set({
        kyc_status: status,
        updatedAt: new Date()
      })
      .where(eq(users.id, clientId));
    
    // Send Telegram notification for KYC status update
    try {
      console.log(`[Admin Client KYC] Sending Telegram notification for KYC update: user ${clientId} to ${status}`);
      const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/telegram/internal/notify/kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: clientId, status: status })
      });
      if (!response.ok) {
        console.error('[Admin Client KYC] Failed to send KYC notification:', await response.text());
      } else {
        console.log('[Admin Client KYC] KYC notification sent successfully');
      }
    } catch (notificationError) {
      console.error('[Admin Client KYC] Error sending KYC notification:', notificationError);
    }
    
    return res.json({
      message: "KYC status updated successfully",
      clientId,
      status,
      updatedBy: adminId
    });
  } catch (error) {
    console.error('Error updating KYC status:', error);
    return res.status(500).json({ message: 'Failed to update KYC status' });
  }
});

/**
 * @route PATCH /api/admin/clients/:id/profile-request/:requestId
 * @desc Review a profile update request (approve or reject)
 * @access Admin only
 */
adminClientRouter.patch('/:id/profile-request/:requestId', requireAuthentication, requireAdminAccess, async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.id);
    const requestId = parseInt(req.params.requestId);
    
    if (isNaN(clientId) || isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid client ID or request ID" });
    }
    
    // Validate request body
    const validationSchema = z.object({
      action: z.enum(['approve', 'reject']),
      comment: z.string().optional()
    });
    
    const validationResult = validationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid request data",
        errors: validationResult.error.format()
      });
    }
    
    const { action, comment } = validationResult.data;
    const adminId = req.user?.id;
    
    if (!adminId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Get the profile update request
    const request = await db.query.profileUpdateRequests.findFirst({
      where: and(
        eq(profileUpdateRequests.id, requestId),
        eq(profileUpdateRequests.userId, clientId)
      )
    });
    
    if (!request) {
      return res.status(404).json({ message: "Profile update request not found" });
    }
    
    // Update the request status
    await db.update(profileUpdateRequests)
      .set({
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        adminComment: comment
      })
      .where(eq(profileUpdateRequests.id, requestId));
    
    // If approved, update the user profile with the requested changes
    if (action === 'approve') {
      // Build update object with only the fields that exist in the request
      const updateData: Record<string, any> = {
        updatedAt: new Date()
      };
      
      // Only include fields that have values in the request
      if (request.fullName !== null) {
        updateData.fullName = request.fullName;
        updateData.full_name = request.fullName; // Also update snake_case version
      }
      if (request.email !== null) updateData.email = request.email;
      if (request.phoneNumber !== null) {
        updateData.phoneNumber = request.phoneNumber;
        updateData.phone_number = request.phoneNumber; // Also update snake_case version
      }
      if (request.address !== null) updateData.address = request.address;
      if (request.countryOfResidence !== null) {
        updateData.countryOfResidence = request.countryOfResidence;
        updateData.country_of_residence = request.countryOfResidence; // Also update snake_case version
      }
      if (request.gender !== null) updateData.gender = request.gender;
      
      // Update the user record
      await db.update(users)
        .set(updateData)
        .where(eq(users.id, clientId));
    }
    
    return res.json({
      message: `Profile update request ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      requestId,
      clientId,
      action,
      reviewedBy: adminId
    });
  } catch (error) {
    console.error('Error reviewing profile update request:', error);
    return res.status(500).json({ message: 'Failed to review profile update request' });
  }
});