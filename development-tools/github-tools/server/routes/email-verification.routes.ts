import { Router } from 'express';
import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { verifyEmailToken } from '../utils/token.utils';
import jwt from 'jsonwebtoken';

const router = Router();

// Email verification endpoint
router.get('/api/verify-email', async (req, res) => {
  try {
    const { token, userId } = req.query;
    
    if (!token || !userId) {
      console.error('Missing token or userId in verification request');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification link. Missing required parameters.' 
      });
    }

    // Parse userId as number
    const userIdNum = parseInt(userId as string, 10);
    if (isNaN(userIdNum)) {
      console.error('Invalid userId format in verification request:', userId);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format.' 
      });
    }

    console.log(`Verifying email for user ${userIdNum} with token`);

    // Verify the token
    const tokenData = verifyEmailToken(token as string);
    if (!tokenData) {
      console.error('Invalid or expired token in verification request');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired verification link. Please request a new one.' 
      });
    }

    // Ensure the token corresponds to the user
    if (tokenData.userId !== userIdNum) {
      console.error('Token user ID mismatch:', { 
        tokenUserId: tokenData.userId, 
        requestUserId: userIdNum 
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification link. User ID mismatch.' 
      });
    }

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.id, userIdNum)
    });

    if (!user) {
      console.error('User not found for email verification:', userIdNum);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found.' 
      });
    }

    // Check if email is already verified
    if (user.emailVerified) {
      console.log('Email already verified for user:', userIdNum);
      return res.status(200).json({ 
        success: true, 
        message: 'Your email is already verified.' 
      });
    }

    // Update user's email verification status
    await db.update(users)
      .set({ 
        emailVerified: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, userIdNum));

    console.log('Email verification successful for user:', userIdNum);
    return res.status(200).json({
      success: true,
      message: 'Your email has been verified successfully! You can now access all features of your account.'
    });
  } catch (error) {
    console.error('Error during email verification:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification link. Please request a new one.' 
      });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(400).json({ 
        success: false, 
        message: 'Verification link has expired. Please request a new one.' 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred during verification. Please try again later.' 
    });
  }
});

export default router;