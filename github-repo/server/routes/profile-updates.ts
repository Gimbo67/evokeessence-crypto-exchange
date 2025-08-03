import { Router } from 'express';
import { db } from "@db";
import { users, profileUpdateRequests } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuthentication, requireAdminAccess } from "../middleware/auth";

const router = Router();

// Validation schema for profile update requests
const profileUpdateRequestSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().min(6).optional(),
  address: z.string().min(3).optional(),
  countryOfResidence: z.string().min(2).optional(),
  gender: z.string().optional()
});

// Validation schema for admin review
const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  adminComment: z.string().optional()
});

/**
 * @route GET /api/profile-updates
 * @desc Get all pending profile update requests (admin only)
 * @access Admin
 */
router.get('/', requireAdminAccess, async (req, res) => {
  try {
    console.log('Fetching all profile update requests');
    
    const updates = await db.query.profileUpdateRequests.findMany({
      orderBy: [desc(profileUpdateRequests.createdAt)],
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            address: true,
            countryOfResidence: true,
            gender: true,
            isAdmin: true,
            isEmployee: true,
            userGroup: true,
            kyc_status: true
          }
        }
      }
    });

    // Format response
    const formattedUpdates = updates.map(update => ({
      id: update.id,
      userId: update.userId,
      username: update.user.username,
      email: update.email || update.user.email,
      fullName: update.fullName || update.user.fullName,
      phoneNumber: update.phoneNumber || update.user.phoneNumber,
      address: update.address || update.user.address,
      countryOfResidence: update.countryOfResidence || update.user.countryOfResidence,
      gender: update.gender || update.user.gender,
      status: update.status,
      createdAt: update.createdAt,
      reviewedAt: update.reviewedAt,
      adminComment: update.adminComment,
      // Include current values for comparison
      currentValues: {
        email: update.user.email,
        fullName: update.user.fullName,
        phoneNumber: update.user.phoneNumber,
        address: update.user.address,
        countryOfResidence: update.user.countryOfResidence,
        gender: update.user.gender
      }
    }));

    return res.json(formattedUpdates);
  } catch (error) {
    console.error('Error fetching profile update requests:', error);
    return res.status(500).json({ message: 'Failed to fetch profile update requests' });
  }
});

/**
 * @route GET /api/profile-updates/user/:userId
 * @desc Get pending profile update requests for a specific user (admin only)
 * @access Admin
 */
router.get('/user/:userId', requireAuthentication, requireAdminAccess, async (req, res) => {
  try {
    // Set content type to JSON first to prevent Vite from intercepting the response
    res.setHeader('Content-Type', 'application/json');
    
    const userId = parseInt(req.params.userId);
    
    console.log(`Fetching profile update requests for user ${userId}`);
    console.log(`Request authenticated: ${(req as any).isAuthenticated?.() || false}`);
    console.log(`Request user: ${JSON.stringify((req as any).user) || 'None'}`);
    
    const updates = await db.query.profileUpdateRequests.findMany({
      where: eq(profileUpdateRequests.userId, userId),
      orderBy: [desc(profileUpdateRequests.createdAt)],
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            address: true,
            countryOfResidence: true,
            gender: true
          }
        }
      }
    });

    console.log(`Found ${updates.length} profile update requests for user ${userId}`);
    
    if (updates.length === 0) {
      console.log(`No profile update requests found for user ${userId}`);
      const response = { pendingUpdates: false, updates: [] };
      return res.json(response);
    }

    // Format response with comparison to current values
    const formattedUpdates = updates.map(update => ({
      id: update.id,
      userId: update.userId,
      username: update.user.username,
      changes: {
        email: update.email !== null ? { 
          current: update.user.email, 
          requested: update.email 
        } : null,
        fullName: update.fullName !== null ? { 
          current: update.user.fullName, 
          requested: update.fullName 
        } : null,
        phoneNumber: update.phoneNumber !== null ? { 
          current: update.user.phoneNumber, 
          requested: update.phoneNumber 
        } : null,
        address: update.address !== null ? { 
          current: update.user.address, 
          requested: update.address 
        } : null,
        countryOfResidence: update.countryOfResidence !== null ? { 
          current: update.user.countryOfResidence, 
          requested: update.countryOfResidence 
        } : null,
        gender: update.gender !== null ? { 
          current: update.user.gender, 
          requested: update.gender 
        } : null
      },
      status: update.status,
      createdAt: update.createdAt,
      reviewedAt: update.reviewedAt,
      adminComment: update.adminComment
    }));

    console.log(`Formatted ${formattedUpdates.length} profile update requests`);
    
    // Create a direct JSON response to avoid HTML responses
    const response = { 
      pendingUpdates: updates.some(update => update.status === 'pending'),
      updates: formattedUpdates 
    };
    
    console.log(`Sending response for ${userId} with ${formattedUpdates.length} updates`);
    return res.json(response);
  } catch (error) {
    console.error(`Error fetching profile update requests for user: ${error}`);
    return res.status(500).json({ message: 'Failed to fetch profile update requests' });
  }
});

/**
 * @route POST /api/profile-updates
 * @desc Submit a profile update request (user)
 * @access Authenticated User
 */
router.post('/', requireAuthentication, async (req, res) => {
  try {
    console.log('Profile update request received');
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Validate request body
    const validationResult = profileUpdateRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid request data', 
        errors: validationResult.error.format() 
      });
    }

    const data = validationResult.data;
    
    // Only include fields that have changed
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if any fields are actually being updated
    const updateFields: any = {};
    let hasChanges = false;

    if (data.fullName !== undefined && data.fullName !== currentUser.fullName) {
      updateFields.fullName = data.fullName;
      hasChanges = true;
    }
    
    if (data.email !== undefined && data.email !== currentUser.email) {
      updateFields.email = data.email;
      hasChanges = true;
    }
    
    if (data.phoneNumber !== undefined && data.phoneNumber !== currentUser.phoneNumber) {
      updateFields.phoneNumber = data.phoneNumber;
      hasChanges = true;
    }
    
    if (data.address !== undefined && data.address !== currentUser.address) {
      updateFields.address = data.address;
      hasChanges = true;
    }
    
    if (data.countryOfResidence !== undefined && data.countryOfResidence !== currentUser.countryOfResidence) {
      updateFields.countryOfResidence = data.countryOfResidence;
      hasChanges = true;
    }
    
    if (data.gender !== undefined && data.gender !== currentUser.gender) {
      updateFields.gender = data.gender;
      hasChanges = true;
    }
    
    if (!hasChanges) {
      return res.status(400).json({ message: 'No changes detected in profile update request' });
    }

    // Check if there's already a pending update request
    const existingRequest = await db.query.profileUpdateRequests.findFirst({
      where: and(
        eq(profileUpdateRequests.userId, userId),
        eq(profileUpdateRequests.status, 'pending')
      )
    });

    if (existingRequest) {
      return res.status(409).json({ 
        message: 'You already have a pending profile update request',
        requestId: existingRequest.id,
        createdAt: existingRequest.createdAt 
      });
    }

    // Insert new profile update request
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
    
    return res.status(201).json({ 
      message: 'Profile update request submitted successfully',
      requestId: newRequest.id,
      status: 'pending',
      createdAt: newRequest.createdAt
    });
  } catch (error) {
    console.error('Error creating profile update request:', error);
    return res.status(500).json({ message: 'Failed to submit profile update request' });
  }
});

/**
 * @route PATCH /api/profile-updates/:id
 * @desc Review a profile update request (admin)
 * @access Admin
 */
router.patch('/:id', requireAuthentication, requireAdminAccess, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ message: 'Admin not authenticated' });
    }

    // Validate request body
    const validationResult = reviewSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid request data', 
        errors: validationResult.error.format() 
      });
    }

    const { status, adminComment } = validationResult.data;
    
    // Find the profile update request
    const updateRequest = await db.query.profileUpdateRequests.findFirst({
      where: eq(profileUpdateRequests.id, requestId)
    });

    if (!updateRequest) {
      return res.status(404).json({ message: 'Profile update request not found' });
    }

    if (updateRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `This request has already been ${updateRequest.status}`,
        status: updateRequest.status,
        reviewedAt: updateRequest.reviewedAt
      });
    }

    // Update the request status
    await db
      .update(profileUpdateRequests)
      .set({
        status: status,
        reviewedBy: adminId,
        adminComment: adminComment || null,
        reviewedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(profileUpdateRequests.id, requestId));

    // If approved, update the user's profile
    if (status === 'approved') {
      console.log(`Applying approved changes from request ${requestId} to user ${updateRequest.userId}`);
      
      // Build update object with only the fields that have values
      const userUpdateData: any = {};
      
      if (updateRequest.fullName !== null) userUpdateData.fullName = updateRequest.fullName;
      if (updateRequest.email !== null) userUpdateData.email = updateRequest.email;
      if (updateRequest.phoneNumber !== null) userUpdateData.phoneNumber = updateRequest.phoneNumber;
      if (updateRequest.address !== null) userUpdateData.address = updateRequest.address;
      if (updateRequest.countryOfResidence !== null) userUpdateData.countryOfResidence = updateRequest.countryOfResidence;
      if (updateRequest.gender !== null) userUpdateData.gender = updateRequest.gender;
      
      // Also update snake_case fields for database consistency
      if (updateRequest.fullName !== null) userUpdateData.full_name = updateRequest.fullName;
      if (updateRequest.phoneNumber !== null) userUpdateData.phone_number = updateRequest.phoneNumber;
      if (updateRequest.countryOfResidence !== null) userUpdateData.country_of_residence = updateRequest.countryOfResidence;
      
      userUpdateData.profileUpdated = true;
      userUpdateData.profile_updated = true;
      userUpdateData.updatedAt = new Date();
      userUpdateData.updated_at = new Date();

      await db
        .update(users)
        .set(userUpdateData)
        .where(eq(users.id, updateRequest.userId));
    }

    // Get updated request with user details for response
    const updatedRequest = await db.query.profileUpdateRequests.findFirst({
      where: eq(profileUpdateRequests.id, requestId),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            address: true,
            countryOfResidence: true,
            gender: true
          }
        },
        reviewer: {
          columns: {
            id: true,
            username: true
          }
        }
      }
    });

    return res.json({
      message: `Profile update request ${status}`,
      request: {
        id: updatedRequest?.id,
        status: updatedRequest?.status,
        reviewedBy: updatedRequest?.reviewer?.username,
        reviewedAt: updatedRequest?.reviewedAt,
        adminComment: updatedRequest?.adminComment,
        changes: {
          email: updatedRequest?.email !== null ? {
            current: updatedRequest?.user.email,
            updated: updatedRequest?.email
          } : null,
          fullName: updatedRequest?.fullName !== null ? {
            current: updatedRequest?.user.fullName,
            updated: updatedRequest?.fullName
          } : null,
          phoneNumber: updatedRequest?.phoneNumber !== null ? {
            current: updatedRequest?.user.phoneNumber,
            updated: updatedRequest?.phoneNumber
          } : null,
          address: updatedRequest?.address !== null ? {
            current: updatedRequest?.user.address,
            updated: updatedRequest?.address
          } : null,
          countryOfResidence: updatedRequest?.countryOfResidence !== null ? {
            current: updatedRequest?.user.countryOfResidence,
            updated: updatedRequest?.countryOfResidence
          } : null,
          gender: updatedRequest?.gender !== null ? {
            current: updatedRequest?.user.gender,
            updated: updatedRequest?.gender
          } : null
        }
      }
    });
  } catch (error) {
    console.error('Error reviewing profile update request:', error);
    return res.status(500).json({ message: 'Failed to review profile update request' });
  }
});

export default router;
export const profileUpdatesRouter = router;