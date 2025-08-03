import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Secret key for JWT signing - use environment variable in production
const SECRET_KEY = process.env.JWT_SECRET || 'email-verification-secret';

/**
 * Generate a JWT token for email verification
 * @param userId - The ID of the user
 * @param email - The user's email address
 * @returns string - The generated JWT token
 */
export function generateEmailVerificationToken(userId: number, email: string): string {
  // Create payload with user ID, email, and purpose
  const payload = {
    userId,
    email,
    purpose: 'email_verification',
    // Add a random string to ensure token uniqueness even for the same user
    nonce: crypto.randomBytes(8).toString('hex')
  };

  // Sign the token with an expiration of 7 days (enough time for users to verify)
  return jwt.sign(payload, SECRET_KEY, { expiresIn: '7d' });
}

/**
 * Verify an email verification token
 * @param token - The JWT token to verify
 * @returns object - The decoded token payload or null if invalid
 */
export function verifyEmailToken(token: string): { userId: number; email: string } | null {
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as any;
    
    // Ensure the token was created for email verification
    if (decoded.purpose !== 'email_verification') {
      return null;
    }
    
    return {
      userId: decoded.userId,
      email: decoded.email
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}