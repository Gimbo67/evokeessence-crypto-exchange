import { Router } from 'express';
import { db } from '@db';
import { users, insertUserSchema, telegramGroups } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { z } from 'zod';
import { sendWelcomeEmail } from '../services/email';
import { recaptchaV2Middleware, validateRecaptcha } from '../middleware/abuse-detection';
import { telegramService } from '../services/telegram';
import { telegramGroupBot } from '../services/telegram-group-bot';

const router = Router();

// Set up passport local strategy
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));

    if (!user) {
      console.log('User not found:', username);
      return done(null, false, { message: 'Invalid credentials' });
    }

    let isValidPassword = false;

    // Check if the stored password has the scrypt format (contains a '.')
    if (user.password.includes('.')) {
      try {
        // This is a scrypt password
        const { promisify } = require('util');
        const { scrypt } = require('crypto');
        const scryptAsync = promisify(scrypt);

        console.log('Attempting to verify with scrypt');
        const [hashedPassword, salt] = user.password.split('.');
        const keyBuffer = (await scryptAsync(password, salt, 64)) as Buffer;
        const keyHex = keyBuffer.toString('hex');
        isValidPassword = keyHex === hashedPassword;
      } catch (error) {
        console.error('Error verifying scrypt password:', error);
        isValidPassword = false;
      }
    } else {
      // This is a bcrypt password
      console.log('Attempting to verify with bcrypt');
      isValidPassword = await bcrypt.compare(password, user.password);
    }

    if (!isValidPassword) {
      console.log('Password mismatch for user:', username);
      return done(null, false, { message: 'Incorrect password.' });
    }

    console.log('User authenticated successfully:', username);
    return done(null, {
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin, 
      is_employee: user.is_employee,
      is_contractor: user.is_contractor,
      user_group: user.user_group,
      kyc_status: user.kyc_status || 'not_started',
      status: user.status,
      // Include other required fields from User type
      address: user.address,
      password: user.password,
      full_name: user.full_name,
      phone_number: user.phone_number,
      country_of_residence: user.country_of_residence,
      gender: user.gender,
      // Contractor-specific fields
      referral_code: user.referral_code,
      contractor_commission_rate: user.contractor_commission_rate,
      // Convert balance to string to avoid type issues
      balance: user.balance ? user.balance.toString() : '0',
      balance_currency: user.balance_currency || 'USD'
    });
  } catch (error) {
    console.error('Login error:', error);
    return done(error);
  }
}));

// Serialize user for the session - OPTIMIZED
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from the session - ULTRA OPTIMIZED FOR SPEED
passport.deserializeUser(async (id: number, done) => {
  try {
    // Fast user lookup with minimal fields
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));

    if (!user) {
      return done(null, null);
    }

    // Ultra-fast object creation without unnecessary processing
    done(null, {
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin,
      is_employee: user.is_employee,
      is_contractor: user.is_contractor,
      user_group: user.user_group,
      kyc_status: user.kyc_status || 'not_started',
      status: user.status,
      // Include other required User fields
      address: user.address,
      password: user.password,
      full_name: user.full_name,
      phone_number: user.phone_number,
      country_of_residence: user.country_of_residence,
      gender: user.gender,
      // Balance fields
      balance: user.balance ? user.balance.toString() : '0',
      balance_currency: user.balance_currency || 'USD',
      two_factor_enabled: user.two_factor_enabled,
      // Contractor fields
      referral_code: user.referral_code || '',
      contractor_commission_rate: user.contractor_commission_rate || 0.85
    });

    // Remove unnecessary logging for performance
  } catch (error) {
    console.error('Deserialization error:', error);
    done(error, null);
  }
});

// Login route - apply recaptchaV2Middleware to handle CAPTCHA validation
router.post('/api/auth/login', recaptchaV2Middleware, (req, res, next) => {
  console.log('Login attempt:', { username: req.body.username });

  passport.authenticate('local', async (err: any, user: any, info: any) => {
    if (err) {
      console.error('Login error:', err);
      return next(err);
    }

    if (!user) {
      console.log('Login failed:', info.message);
      return res.status(401).json({ message: info.message || 'Invalid credentials' });
    }

    // Check if 2FA is enabled
    try {
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, user.id)
      });
      
      // Only require 2FA if the user has enabled it AND they're verified
      const twoFactorEnabled = dbUser?.two_factor_enabled || false;
      const kycStatus = (dbUser?.kyc_status || '').toLowerCase();
      const isVerified = ['approved', 'complete', 'verified'].includes(kycStatus);
      const isContractor = dbUser?.is_contractor || false;
      const referralCode = dbUser?.referral_code || '';
      const contractorCommissionRate = dbUser?.contractor_commission_rate || 0.85;
      
      console.log('Login user check:', {
        username: user.username,
        twoFactorEnabled,
        kycStatus,
        isVerified,
        isContractor,
        referralCode
      });
      
      // Only require 2FA for verified users who have enabled it
      if (twoFactorEnabled && isVerified) {
        console.log('Verified user has 2FA enabled, requiring verification code:', user.username);
        return res.json({
          requireTwoFactor: true,
          username: user.username,
          message: 'Two-factor authentication required'
        });
      }
      
      // If 2FA is not enabled, proceed with normal login
      // Update last_login_at timestamp
      await db.update(users)
        .set({ last_login_at: new Date() })
        .where(eq(users.id, user.id));
      
      console.log('Updated last_login_at timestamp for user:', user.username);
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error('Login error:', loginErr);
          return next(loginErr);
        }

        console.log('Login successful for user:', user.username);
        return res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.is_admin,
          isEmployee: user.is_employee,
          isContractor: isContractor,
          userGroup: user.user_group,
          kycStatus: user.kyc_status || 'not_started', // For frontend compatibility
          kyc_status: user.kyc_status || 'not_started',
          balance: user.balance ? parseFloat(user.balance.toString()) : 0,
          balanceCurrency: user.balance_currency || 'USD',
          balances: [{
            amount: user.balance ? parseFloat(user.balance.toString()) : 0,
            currency: user.balance_currency || 'USD'
          }],
          twoFactorEnabled: twoFactorEnabled,
          referralCode: referralCode,
          contractorCommissionRate: contractorCommissionRate
        });
      });
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      return res.status(500).json({ message: 'Error during login' });
    }
  })(req, res, next);
});

// User Registration Route - apply recaptchaV2Middleware to handle CAPTCHA validation
router.post('/api/auth/register', recaptchaV2Middleware, async (req, res) => {
  try {
    console.log('Registration attempt:', { 
      username: req.body.username,
      email: req.body.email
    });

    // Define registration schema
    const registrationSchema = z.object({
      username: z.string().min(3).max(50),
      email: z.string().email(),
      password: z.string().min(6),
      fullName: z.string().min(2),
      phoneNumber: z.string().optional(),
      address: z.string().optional(),
      countryOfResidence: z.string().optional(),
      gender: z.enum(['male', 'female', 'other']).optional(),
      kyc_status: z.string().default('not_started'),
      profileUpdated: z.boolean().default(false),
      referred_by: z.string().optional() // Referral code field
    });

    // Validate input
    const validationResult = registrationSchema.safeParse(req.body);
    if (!validationResult.success) {
      console.error('Registration validation error:', validationResult.error);
      return res.status(400).json({ 
        message: 'Invalid registration data', 
        errors: validationResult.error.errors 
      });
    }

    const validatedData = validationResult.data;

    // Check if username already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, validatedData.username)
    });

    if (existingUser) {
      console.log('Registration failed: Username already exists', validatedData.username);
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check if email already exists
    const existingEmail = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email)
    });

    if (existingEmail) {
      console.log('Registration failed: Email already exists', validatedData.email);
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(validatedData.password, salt);

    // Check if the provided referral code exists
    let referringContractor = null;
    let contractorId = null;
    let isValidReferralCode = false;
    
    if (validatedData.referred_by) {
      // Special case for referral code A64S (andreavass)
      if (validatedData.referred_by === 'A64S') {
        console.log(`Special referral code A64S detected - assigning to andreavass`);
        // Find andreavass contractor
        referringContractor = await db.query.users.findFirst({
          where: eq(users.username, 'andreavass')
        });
        
        if (referringContractor) {
          console.log(`Found andreavass with ID: ${referringContractor.id}`);
          contractorId = referringContractor.id;
          isValidReferralCode = true;
        } else {
          console.error(`Critical error: andreavass contractor not found in database`);
        }
      } else {
        // First check if it's a contractor referral code
        console.log(`[REFERRAL DEBUG] Checking contractor referral code: ${validatedData.referred_by}`);
        referringContractor = await db.query.users.findFirst({
          where: eq(users.referral_code, validatedData.referred_by)
        });
        
        if (referringContractor && referringContractor.is_contractor) {
          console.log(`[REFERRAL DEBUG] Valid referral from contractor: ${referringContractor.username} (ID: ${referringContractor.id})`);
          contractorId = referringContractor.id;
          isValidReferralCode = true;
        } else {
          // If not a contractor code, check if it's a Telegram group referral code
          console.log(`[REFERRAL DEBUG] Checking Telegram group referral code: ${validatedData.referred_by}`);
          const telegramGroup = await db.query.telegramGroups.findFirst({
            where: and(
              eq(telegramGroups.referral_code, validatedData.referred_by),
              eq(telegramGroups.is_active, true)
            )
          });
          
          if (telegramGroup) {
            console.log(`[REFERRAL DEBUG] Valid Telegram group referral code: ${validatedData.referred_by} (Group: ${telegramGroup.group_name || telegramGroup.telegram_group_id})`);
            isValidReferralCode = true;
          } else {
            console.log(`[REFERRAL DEBUG] Invalid referral code: ${validatedData.referred_by} - not found in contractors or Telegram groups`);
          }
        }
      }
    }

    // Create user in database with proper field names
    const newUser = {
      username: validatedData.username,
      email: validatedData.email,
      password: hashedPassword,
      full_name: validatedData.fullName,
      phone_number: validatedData.phoneNumber || '',
      address: validatedData.address || '',
      country_of_residence: validatedData.countryOfResidence || '',
      gender: validatedData.gender || '',
      is_admin: false,
      is_employee: false,
      is_contractor: false,
      kyc_status: validatedData.kyc_status,
      balance: '0',
      balance_currency: 'USD',
      created_at: new Date(),
      profile_updated: validatedData.profileUpdated,
      referred_by: isValidReferralCode ? validatedData.referred_by : null,
      contractor_id: contractorId, // Set the contractor ID directly for permanent association
      referral_code: '' // New users start with an empty referral code
    };

    console.log('Creating new user:', { username: newUser.username, email: newUser.email });
    
    const [insertedUser] = await db.insert(users).values(newUser).returning();
    
    console.log('User created successfully:', { 
      id: insertedUser.id, 
      username: insertedUser.username 
    });

    // Send welcome email with verification link
    try {
      console.log('Sending welcome email to newly registered user:', insertedUser.email);
      await sendWelcomeEmail(
        insertedUser.email || '', 
        insertedUser.full_name || insertedUser.username,
        insertedUser.id
      );
      console.log('Welcome email sent successfully');
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail registration if email fails, just log the error
    }

    // Send Telegram notification for new user registration
    try {
      console.log(`[TELEGRAM DEBUG] ===== TELEGRAM NOTIFICATION SECTION START =====`);
      console.log(`[TELEGRAM DEBUG] Sending Telegram notification for new user registration: ${insertedUser.username}`);
      console.log(`[TELEGRAM DEBUG] isValidReferralCode: ${isValidReferralCode}, referred_by: ${validatedData.referred_by}`);
      console.log(`[TELEGRAM DEBUG] Current stack trace:`, new Error().stack?.split('\n').slice(0, 5));
      
      // Send to the new group bot system (only for valid referral codes)
      if (isValidReferralCode) {
        console.log(`[TELEGRAM DEBUG] ENTERING GROUP BOT NOTIFICATION BLOCK`);
        console.log(`[TELEGRAM DEBUG] User registered with valid referral code: ${validatedData.referred_by}`);
        console.log(`[TELEGRAM DEBUG] About to send group bot notification for user ID: ${insertedUser.id}`);
        try {
          // Call telegram notification function directly instead of HTTP request
          const timestamp = new Date().toLocaleString('en-US', { 
            timeZone: 'Europe/Prague',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });
          
          const message = `👤 <b>New Registration</b>

<b>Time:</b> ${timestamp}
<b>Full Name:</b> ${insertedUser.full_name || 'Not provided'}
<b>Username:</b> ${insertedUser.username}
<b>Email:</b> ${insertedUser.email || 'Not provided'}

Just registered using this group's referral code.`;

          // Send notification directly to the group
          console.log('[TELEGRAM DEBUG] About to call telegramGroupBot.sendNotificationToGroup with:', {
            referralCode: validatedData.referred_by,
            userId: insertedUser.id,
            messageLength: message.length
          });
          
          const notificationResult = await telegramGroupBot.sendNotificationToGroup(
            validatedData.referred_by,
            message,
            'registration',
            insertedUser.id
          );
          console.log('[TELEGRAM DEBUG] Group bot notification sent successfully via direct call', notificationResult);
        } catch (groupBotError) {
          console.error('[TELEGRAM DEBUG] Error sending group bot notification via direct call:', groupBotError);
        }
      } else {
        console.log(`[TELEGRAM DEBUG] No valid referral code, skipping group bot notification`);
        console.log(`[TELEGRAM DEBUG] isValidReferralCode: ${isValidReferralCode}, referred_by: ${validatedData.referred_by}`);
      }
      
      // ALWAYS send to existing telegram service for ALL registrations (legacy bot)
      console.log(`[TELEGRAM DEBUG] Sending legacy bot notification for all registrations`);
      const telegramMessage = telegramService.formatUserRegistration(
        insertedUser.username,
        insertedUser.full_name || insertedUser.username,
        insertedUser.email || '',
        validatedData.referred_by
      );
      await telegramService.sendRegistrationNotification(telegramMessage);
      console.log('[TELEGRAM DEBUG] Legacy telegram registration notification sent successfully');
    } catch (telegramError) {
      console.error('[TELEGRAM DEBUG] Error sending Telegram registration notification:', telegramError);
      // Don't fail registration if Telegram fails, just log the error
    }

    // Create sanitized user object for response - transform snake_case to camelCase for frontend
    const userData = {
      id: insertedUser.id,
      username: insertedUser.username,
      email: insertedUser.email,
      fullName: insertedUser.full_name,
      address: insertedUser.address,
      countryOfResidence: insertedUser.country_of_residence,
      phoneNumber: insertedUser.phone_number,
      gender: insertedUser.gender,
      isAdmin: false,
      isEmployee: false,
      isContractor: false,
      kycStatus: insertedUser.kyc_status,
      balance: 0,
      balanceCurrency: 'USD',
      referralCode: '',
      contractorCommissionRate: 0.85,
      balances: [{
        amount: 0,
        currency: 'USD'
      }]
    };

    // Log the user in
    // Create proper user object for req.login that matches passport expectations
    const loginUser = {
      id: insertedUser.id,
      username: insertedUser.username,
      email: insertedUser.email,
      full_name: insertedUser.full_name,
      address: insertedUser.address,
      country_of_residence: insertedUser.country_of_residence,
      phone_number: insertedUser.phone_number,
      gender: insertedUser.gender,
      password: '', // Don't need to include actual password
      is_admin: false,
      is_employee: false,
      is_contractor: false,
      kyc_status: insertedUser.kyc_status,
      balance: '0',
      balance_currency: 'USD',
      status: 'active',
      referral_code: '',
      contractor_commission_rate: 0.85
    };
    
    req.login(loginUser, (loginErr) => {
      if (loginErr) {
        console.error('Auto-login error after registration:', loginErr);
        // Still send successful response but note login failed
        return res.status(201).json({ 
          ...userData, 
          message: 'Registration successful but auto-login failed' 
        });
      }

      console.log('Registration and auto-login successful for user:', userData.username);
      return res.status(201).json(userData);
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: (error as Error).message });
  }
});

// Session update endpoint for 2FA flow - apply recaptchaV2Middleware to handle CAPTCHA for 2FA
router.post('/api/auth/session', recaptchaV2Middleware, async (req, res) => {
  console.log('Session update requested:', req.body);
  
  const { userId, twoFactorVerified } = req.body;
  
  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }
  
  try {
    // Find the user in the database
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!user) {
      console.error(`Session update failed: User ${userId} not found`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`Updating session for user: ${user.username} (${userId})`);
    
    // Create the user object with all required fields for the session
    const userForSession = {
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin,
      is_employee: user.is_employee,
      is_contractor: user.is_contractor,
      user_group: user.user_group,
      kyc_status: user.kyc_status || 'not_started',
      status: user.status,
      address: user.address,
      full_name: user.full_name,
      phone_number: user.phone_number,
      country_of_residence: user.country_of_residence,
      gender: user.gender,
      balance: user.balance ? user.balance.toString() : '0',
      balance_currency: user.balance_currency || 'USD',
      two_factor_enabled: user.two_factor_enabled,
      two_factor_verified: twoFactorVerified || false,
      referral_code: user.referral_code || '',
      contractor_commission_rate: user.contractor_commission_rate || 0.85
    };
    
    // Log the user in using Passport's req.login
    req.login(userForSession, (loginErr) => {
      if (loginErr) {
        console.error('Error during session update login:', loginErr);
        return res.status(500).json({ message: 'Session update failed' });
      }
      
      console.log('Session updated successfully for 2FA authentication');
      return res.json({ 
        success: true, 
        message: 'Session updated successfully',
        userId: user.id,
        username: user.username
      });
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return res.status(500).json({ message: 'Error updating session' });
  }
});

// Authentication status endpoint
router.get('/api/auth/status', (req, res) => {
  console.log('Auth status check - User authenticated:', req.isAuthenticated());
  
  if (!req.isAuthenticated()) {
    console.log('User not authenticated for status check');
    return res.json({ 
      authenticated: false, 
      user: null,
      message: 'Not authenticated' 
    });
  }

  const user = req.user as any;
  console.log('Sending auth status for user:', {
    id: user.id,
    username: user.username,
    is_admin: user.is_admin,
    is_employee: user.is_employee,
    is_contractor: user.is_contractor,
    timestamp: new Date().toISOString()
  });

  // Return authentication status with user data
  res.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.is_admin,
      isEmployee: user.is_employee,
      isContractor: user.is_contractor || false,
      userGroup: user.user_group,
      kycStatus: user.kyc_status || 'not_started',
      fullName: user.full_name,
      phoneNumber: user.phone_number,
      countryOfResidence: user.country_of_residence,
      twoFactorEnabled: user.two_factor_enabled,
      balanceCurrency: user.balance_currency,
      referralCode: user.referral_code || '',
      contractorCommissionRate: user.contractor_commission_rate || 0.85,
      balance: user.balance ? parseFloat(user.balance) : 0,
      balances: [{
        amount: user.balance ? parseFloat(user.balance) : 0,
        currency: user.balance_currency || 'USD'
      }]
    }
  });
});

// Get current user route
router.get('/api/user', (req, res) => {
  if (!req.isAuthenticated()) {
    console.log('User not authenticated');
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const user = req.user as any;
  console.log('Sending user data:', {
    id: user.id,
    username: user.username,
    is_admin: user.is_admin,
    is_employee: user.is_employee,
    is_contractor: user.is_contractor,
    user_group: user.user_group,
    balance: user.balance,
    balance_currency: user.balance_currency,
    referral_code: user.referral_code,
    contractor_commission_rate: user.contractor_commission_rate,
    timestamp: new Date().toISOString()
  });

  // Transform snake_case DB fields to camelCase for frontend API responses
  // We need both to maintain backward compatibility
  res.json({
    ...user,
    // Add camelCase versions of snake_case fields for frontend
    isAdmin: user.is_admin,
    isEmployee: user.is_employee,
    isContractor: user.is_contractor || false,
    userGroup: user.user_group,
    kycStatus: user.kyc_status || 'not_started',
    fullName: user.full_name,
    phoneNumber: user.phone_number,
    countryOfResidence: user.country_of_residence,
    twoFactorEnabled: user.two_factor_enabled,
    balanceCurrency: user.balance_currency,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastLoginAt: user.last_login_at,
    profileUpdated: user.profile_updated,
    referralCode: user.referral_code || '',
    contractorCommissionRate: user.contractor_commission_rate || 0.85,
    // Ensure numbers are correctly parsed
    balance: user.balance ? parseFloat(user.balance) : 0,
    // Add additional formatted structures
    balances: [{
      amount: user.balance ? parseFloat(user.balance) : 0,
      currency: user.balance_currency || 'USD'
    }]
  });
});

export default router;