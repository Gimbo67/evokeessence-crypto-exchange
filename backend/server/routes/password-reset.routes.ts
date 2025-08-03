import express, { Request, Response } from 'express';
import { db } from '../../db';
import { users, verificationCodes } from '../../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { createAndSendVerificationCode, verifyCode } from '../services/email';
import bcrypt from 'bcrypt';

export const passwordResetRouter = express.Router();

/**
 * @route POST /api/password-reset/request
 * @desc Request a password reset code
 * @access Public
 */
// Root endpoint removed

passwordResetRouter.post('/request', async (req: Request, res: Response) => {
  console.log('Received password reset request:', req.body);
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required'
      });
    }

    // Check if the user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) {
      // For security reasons, don't reveal if email exists or not
      // Just return success message even if no user found
      return res.status(200).json({ 
        success: true, 
        message: 'If your email is registered, you will receive a verification code shortly'
      });
    }

    // Generate and send verification code
    await createAndSendVerificationCode(user.id, email, 'password_reset');

    return res.status(200).json({
      success: true,
      message: 'Verification code sent to your email'
    });
  } catch (error) {
    console.error('Error in password reset request:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred while processing your request'
    });
  }
});

/**
 * @route POST /api/password-reset/verify
 * @desc Verify the code and reset password
 * @access Public
 */
passwordResetRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, verification code, and new password are required'
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false, 
        message: 'Password must be at least 8 characters long'
      });
    }

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found'
      });
    }

    // Verify the code
    const codeVerified = await verifyCode(user.id, code, 'password_reset');

    if (!codeVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired verification code'
      });
    }

    // Hash the new password with bcrypt (same as auth system)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user's password
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, user.id));

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Error in password reset verification:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred while processing your request'
    });
  }
});