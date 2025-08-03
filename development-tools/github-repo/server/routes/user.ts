import { Router } from 'express';
import { db } from "@db";
import { users, profileUpdateRequests } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Profile update schema
const profileUpdateSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().min(6).optional(),
  address: z.string().min(3).optional(),
  countryOfResidence: z.string().min(2).optional(),
  gender: z.string().optional()
});

// Get user profile
router.get("/profile", async (req, res) => {
  try {
    console.log('Profile GET request received');

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User ID not found" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Map database fields to frontend format
    const userData = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      countryOfResidence: user.countryOfResidence,
      gender: user.gender,
      isAdmin: user.isAdmin,
      isEmployee: user.isEmployee,
      userGroup: user.userGroup,
      kycStatus: user.kyc_status,
      balance: user.balance
    };

    console.log('Returning user profile:', {
      id: userData.id,
      username: userData.username,
      fullName: userData.fullName,
      email: userData.email
    });

    res.setHeader('Content-Type', 'application/json');
    res.json(userData);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Update user profile (now creates a profile update request for admin approval)
router.put("/profile", async (req, res) => {
  try {
    console.log('Profile update request received:', {
      body: { ...req.body, password: '[REDACTED]' },
      authenticated: req.isAuthenticated(),
      userId: req.user?.id
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User ID not found" });
    }

    // Validate request body
    const result = profileUpdateSchema.safeParse(req.body);
    if (!result.success) {
      console.log('Validation failed:', result.error.issues);
      return res.status(400).json({
        error: "Invalid input",
        details: result.error.issues
      });
    }

    // Get current user data for comparison
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if there are any actual changes
    let hasChanges = false;
    const updateFields: any = {};

    if (result.data.fullName !== undefined && result.data.fullName !== currentUser.fullName) {
      updateFields.fullName = result.data.fullName;
      hasChanges = true;
    }
    
    if (result.data.email !== undefined && result.data.email !== currentUser.email) {
      updateFields.email = result.data.email;
      hasChanges = true;
    }
    
    if (result.data.phoneNumber !== undefined && result.data.phoneNumber !== currentUser.phoneNumber) {
      updateFields.phoneNumber = result.data.phoneNumber;
      hasChanges = true;
    }
    
    if (result.data.countryOfResidence !== undefined && result.data.countryOfResidence !== currentUser.countryOfResidence) {
      updateFields.countryOfResidence = result.data.countryOfResidence;
      hasChanges = true;
    }
    
    if (result.data.gender !== undefined && result.data.gender !== currentUser.gender) {
      updateFields.gender = result.data.gender;
      hasChanges = true;
    }
    
    if (result.data.address !== undefined && result.data.address !== currentUser.address) {
      updateFields.address = result.data.address;
      hasChanges = true;
    }
    
    if (!hasChanges) {
      return res.status(400).json({ error: 'No changes detected in profile update request' });
    }

    // Check if there's already a pending update request
    const existingRequest = await db.query.profileUpdateRequests.findFirst({
      where: eq(profileUpdateRequests.userId, userId),
      orderBy: [desc(profileUpdateRequests.createdAt)]
    });

    if (existingRequest && existingRequest.status === 'pending') {
      console.log(`User ${userId} already has a pending update request (${existingRequest.id})`);
      return res.status(409).json({ 
        message: 'You already have a pending profile update request',
        requestId: existingRequest.id
      });
    }

    // Create a profile update request instead of updating user directly
    const [newRequest] = await db
      .insert(profileUpdateRequests)
      .values({
        userId: userId,
        fullName: updateFields.fullName || null,
        email: updateFields.email || null,
        phoneNumber: updateFields.phoneNumber || null,
        address: updateFields.address || null,
        countryOfResidence: updateFields.countryOfResidence || null,
        gender: updateFields.gender || null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    console.log(`Profile update request ${newRequest.id} created for user ${userId}`);

    // Return the current user data and message about pending request
    const userData = {
      id: currentUser.id,
      username: currentUser.username,
      fullName: currentUser.fullName,
      email: currentUser.email,
      phoneNumber: currentUser.phoneNumber,
      address: currentUser.address,
      countryOfResidence: currentUser.countryOfResidence,
      gender: currentUser.gender,
      isAdmin: currentUser.isAdmin,
      isEmployee: currentUser.isEmployee,
      userGroup: currentUser.userGroup,
      kycStatus: currentUser.kyc_status,
      balance: currentUser.balance,
      profileUpdatePending: true,
      profileUpdateRequestId: newRequest.id
    };

    console.log('Profile update request created successfully:', {
      userId: userData.id,
      username: userData.username,
      requestId: newRequest.id,
      status: 'pending'
    });

    res.setHeader('Content-Type', 'application/json');
    res.status(201).json({
      message: 'Profile update request submitted successfully. An administrator will review your changes.',
      user: userData,
      requestId: newRequest.id,
      status: 'pending'
    });
  } catch (error) {
    console.error("Error creating profile update request:", error);
    res.status(500).json({ error: "Failed to submit profile update request" });
  }
});

// Get user's profile update requests
router.get("/profile-updates", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User ID not found" });
    }

    console.log(`Fetching profile update requests for user ${userId}`);
    
    const updates = await db.query.profileUpdateRequests.findMany({
      where: eq(profileUpdateRequests.userId, userId),
      orderBy: [desc(profileUpdateRequests.createdAt)]
    });

    console.log(`Found ${updates.length} profile update requests for user ${userId}`);
    
    res.json({
      message: 'Profile update requests retrieved successfully',
      requests: updates,
      hasPendingRequest: updates.some(req => req.status === 'pending')
    });
  } catch (error) {
    console.error("Error fetching profile update requests:", error);
    res.status(500).json({ error: "Failed to fetch profile update requests" });
  }
});

// Cancel profile update request
router.delete("/profile-updates/:requestId", async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User ID not found" });
    }

    const requestId = parseInt(req.params.requestId);
    if (isNaN(requestId)) {
      return res.status(400).json({ error: "Invalid request ID" });
    }

    console.log(`Attempting to cancel profile update request ${requestId} for user ${userId}`);

    // First check if the request exists and belongs to this user
    const updateRequest = await db.query.profileUpdateRequests.findFirst({
      where: and(
        eq(profileUpdateRequests.id, requestId),
        eq(profileUpdateRequests.userId, userId)
      )
    });

    if (!updateRequest) {
      return res.status(404).json({ error: "Profile update request not found" });
    }

    if (updateRequest.status !== 'pending') {
      return res.status(400).json({ 
        error: "Cannot cancel a request that is not pending",
        status: updateRequest.status
      });
    }

    // Update the request status to 'cancelled'
    await db
      .update(profileUpdateRequests)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(and(
        eq(profileUpdateRequests.id, requestId),
        eq(profileUpdateRequests.userId, userId)
      ));

    console.log(`Profile update request ${requestId} cancelled successfully`);

    res.json({
      message: 'Profile update request cancelled successfully',
      requestId: requestId
    });
  } catch (error) {
    console.error("Error cancelling profile update request:", error);
    res.status(500).json({ error: "Failed to cancel profile update request" });
  }
});

export default router;