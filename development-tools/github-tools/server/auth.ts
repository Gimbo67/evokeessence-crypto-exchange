import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { randomBytes } from "crypto";
import { promisify } from "util";
import { users, userSessions, insertUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { 
  loginRateLimiter, 
  bannedIpMiddleware, 
  recordFailedLoginAttempt, 
  resetFailedLoginAttempts, 
  shouldShowCaptcha,
  validateRecaptcha,
  recaptchaV2Middleware 
} from './middleware/abuse-detection';

const MemoryStore = createMemoryStore(session);

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    return await bcrypt.compare(supplied, stored);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "evokeessence-secret",
    resave: true, // Changed to true to ensure session is saved on every request
    saveUninitialized: true, // Changed to true to prevent session expiration issues
    cookie: {
      // Ensure cookies work for all HTTP methods
      sameSite: 'lax',
      httpOnly: true,
      // Setting a longer session timeout for testing
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    },
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
    // Generate a UUID for session ID
    genid: function(req) {
      return randomBytes(16).toString('hex'); // Generate a random 32-character session ID
    }
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = { 
      secure: true,
      sameSite: 'lax',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    };
  }

  // Make sure to add this before any routes
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Add debugging middleware for authentication
  app.use((req, res, next) => {
    console.log(`Auth Debug - ${req.method} ${req.path} - authenticated: ${req.isAuthenticated()}, user: ${req.user ? req.user.id : 'none'}`);
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log('Login attempt for username:', username);
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          console.log('User not found:', username);
          return done(null, false, { message: "Incorrect username." });
        }

        const isMatch = await comparePasswords(password, user.password);
        if (!isMatch) {
          console.log('Password mismatch for user:', username);
          return done(null, false, { message: "Incorrect password." });
        }

        // Log raw PostgreSQL values
        console.log('Raw database values for authentication:', {
          is_admin: user.is_admin,
          is_admin_type: typeof user.is_admin,
          is_employee: user.is_employee,
          is_employee_type: typeof user.is_employee
        });
        
        // Properly convert PostgreSQL boolean values to JavaScript booleans
        const isAdmin = user.is_admin === true || 
                       user.is_admin === 't' || 
                       user.is_admin === 1 || 
                       String(user.is_admin).toLowerCase() === 'true' || 
                       String(user.is_admin).toLowerCase() === 't';
                       
        const isEmployee = user.is_employee === true || 
                          user.is_employee === 't' || 
                          user.is_employee === 1 || 
                          String(user.is_employee).toLowerCase() === 'true' || 
                          String(user.is_employee).toLowerCase() === 't';
                          
        // Create sanitized user object with camelCase keys and balances
        const userData = {
          id: user.id,
          username: user.username,
          email: user.email || '',
          kycStatus: user.kyc_status,
          kyc_status: user.kyc_status,
          isAdmin: isAdmin,
          isEmployee: isEmployee,
          userGroup: user.user_group || '',
          fullName: user.full_name || '',
          phoneNumber: user.phone_number || '',
          address: user.address || '',
          countryOfResidence: user.country_of_residence || '',
          gender: user.gender || '',
          twoFactorEnabled: user.two_factor_enabled === true || 
                          user.two_factor_enabled === 't' || 
                          user.two_factor_enabled === 1 || 
                          String(user.two_factor_enabled).toLowerCase() === 'true' || 
                          String(user.two_factor_enabled).toLowerCase() === 't',
          balances: [
            {
              amount: Number(user.balance) || 0,
              currency: user.balance_currency || 'EUR'
            }
          ]
        };

        console.log('User authenticated:', {
          id: userData.id,
          username: userData.username,
          isAdmin: userData.isAdmin,
          isEmployee: userData.isEmployee,
          userGroup: userData.userGroup
        });

        return done(null, userData);
      } catch (err) {
        console.error('Authentication error:', err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id, {
      isAdmin: user.isAdmin,
      isEmployee: user.isEmployee,
      userGroup: user.userGroup
    });
    
    // Instead of just serializing the ID, serialize the entire user object
    // This keeps all properties intact between requests
    done(null, user);
  });

  passport.deserializeUser(async (user: any, done) => {
    try {
      // If we got the whole user object (as expected), return it directly
      if (user && typeof user === 'object' && user.id && user.username) {
        console.log('Deserializing complete user object:', {
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin,
          isEmployee: user.isEmployee,
          userGroup: user.userGroup
        });
        return done(null, user);
      }
      
      // Fallback for backward compatibility if only ID was serialized
      const userId = typeof user === 'object' ? user.id : user;
      console.log('Deserializing user ID:', userId);
      
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!dbUser) {
        console.log('User not found during deserialization:', userId);
        return done(new Error('User not found'));
      }

      // Log raw PostgreSQL values
      console.log('Raw database values for deserialization:', {
        is_admin: dbUser.is_admin,
        is_admin_type: typeof dbUser.is_admin,
        is_employee: dbUser.is_employee,
        is_employee_type: typeof dbUser.is_employee
      });
      
      // Properly convert PostgreSQL boolean values to JavaScript booleans
      const isAdmin = dbUser.is_admin === true || 
                     dbUser.is_admin === 't' || 
                     dbUser.is_admin === 1 || 
                     String(dbUser.is_admin).toLowerCase() === 'true' || 
                     String(dbUser.is_admin).toLowerCase() === 't';
                     
      const isEmployee = dbUser.is_employee === true || 
                        dbUser.is_employee === 't' || 
                        dbUser.is_employee === 1 || 
                        String(dbUser.is_employee).toLowerCase() === 'true' || 
                        String(dbUser.is_employee).toLowerCase() === 't';
                        
      // Create sanitized user object with camelCase keys and balances
      const userData = {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email || '',
        kycStatus: dbUser.kyc_status,
        kyc_status: dbUser.kyc_status,
        isAdmin: isAdmin,
        isEmployee: isEmployee,
        userGroup: dbUser.user_group || '',
        fullName: dbUser.full_name || '',
        phoneNumber: dbUser.phone_number || '',
        address: dbUser.address || '',
        countryOfResidence: dbUser.country_of_residence || '',
        gender: dbUser.gender || '',
        twoFactorEnabled: dbUser.two_factor_enabled === true || 
                        dbUser.two_factor_enabled === 't' || 
                        dbUser.two_factor_enabled === 1 || 
                        String(dbUser.two_factor_enabled).toLowerCase() === 'true' || 
                        String(dbUser.two_factor_enabled).toLowerCase() === 't',
        balances: [
          {
            amount: Number(dbUser.balance) || 0,
            currency: dbUser.balance_currency || 'EUR'
          }
        ]
      };

      console.log('User deserialized from DB:', {
        id: userData.id,
        username: userData.username,
        isAdmin: userData.isAdmin,
        isEmployee: userData.isEmployee,
        userGroup: userData.userGroup
      });

      done(null, userData);
    } catch (err) {
      console.error('Deserialization error:', err);
      done(err);
    }
  });

  // Apply security middleware

  // Apply rate limiting and IP ban checks to login route
  app.post("/api/login", 
    loginRateLimiter,
    bannedIpMiddleware,
    recaptchaV2Middleware,
    async (req, res, next) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      console.log('Login request received:', {
        body: { ...req.body, password: '[REDACTED]' },
        ip,
        requireCaptcha: shouldShowCaptcha(ip)
      });

      // Check if CAPTCHA should be shown due to previous failed attempts
      if (shouldShowCaptcha(ip)) {
        // If required CAPTCHA was already validated by recaptchaV2Middleware, continue
        console.log('[Security] CAPTCHA required for IP:', ip);
      } else {
        // For normal first attempts, validate reCAPTCHA v3
        const recaptchaToken = req.body['g-recaptcha-response'];
        
        if (recaptchaToken) {
          const isValidToken = await validateRecaptcha(recaptchaToken, 'login', ip, req.headers);
          
          if (!isValidToken) {
            console.log('[Security] reCAPTCHA v3 validation failed for IP:', ip);
            return res.status(403).json({ 
              success: false, 
              message: 'reCAPTCHA verification failed',
              requireCaptcha: true
            });
          }
        }
      }

      // Proceed with authentication
      passport.authenticate("local", async (err: any, user: Express.User | false, info: any) => {
        if (err) {
          console.error('Login error:', err);
          return next(err);
        }
        
        // If authentication failed
        if (!user) {
          console.log('Login failed:', info?.message);
          
          // Record the failed attempt and check if we need to show CAPTCHA or ban
          const { showCaptcha, banned } = await recordFailedLoginAttempt(ip);
          
          if (banned) {
            return res.status(403).json({ 
              message: "Too many failed login attempts. Your IP has been temporarily blocked.",
              banned: true
            });
          }
          
          return res.status(400).json({ 
            message: info?.message ?? "Login failed",
            requireCaptcha: showCaptcha
          });
        }

        // Authentication succeeded, reset failed attempts counter
        resetFailedLoginAttempts(ip);

        // Before login, track this session in our database
        try {
          // Check if the session already exists in database
          const sessionId = req.sessionID || randomBytes(16).toString('hex');
          const existingSession = await db.query.userSessions.findFirst({
            where: eq(userSessions.session_id, sessionId)
          });
          
          // Get user agent and IP for device tracking
          const userAgent = req.headers['user-agent'] || '';
          const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
          
          // Get device info from user agent
          let deviceInfo = 'Unknown device';
          let deviceType = 'other';
          
          if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
            deviceInfo = userAgent.includes('iPad') ? 'iPad' : 'iPhone';
            deviceType = 'ios';
          } else if (userAgent.includes('Android')) {
            deviceInfo = 'Android device';
            deviceType = 'android';
          } else if (userAgent.includes('Mozilla')) {
            deviceInfo = 'Web browser';
            deviceType = 'web';
          }
          
          // Set expiry date based on cookie maxAge
          const maxAge = req.session?.cookie?.maxAge || 24 * 60 * 60 * 1000; // Default to 24h
          const expiresAt = new Date(Date.now() + maxAge);
          
          // If session exists, update it
          if (existingSession) {
            await db.update(userSessions)
              .set({
                user_id: user.id,
                ip_address: ipAddress,
                user_agent: userAgent,
                last_activity: new Date(),
                expires_at: expiresAt
              })
              .where(eq(userSessions.session_id, sessionId));
              
            console.log(`Updated existing session: ${sessionId} for user: ${user.id}`);
          } else {
            // Otherwise create a new session record
            await db.insert(userSessions)
              .values({
                session_id: sessionId,
                user_id: user.id,
                ip_address: ipAddress,
                user_agent: userAgent,
                device_type: deviceType,
                device_info: deviceInfo,
                created_at: new Date(),
                last_activity: new Date(),
                expires_at: expiresAt
              });
              
            console.log(`Created new session: ${sessionId} for user: ${user.id}`);
          }
        } catch (sessionError) {
          console.error('Error tracking user session:', sessionError);
          // Don't fail the login if session tracking fails
        }

        req.login(user, (err) => {
          if (err) {
            console.error('Session creation error:', err);
            return next(err);
          }

          // Create sanitized user object with required fields for routing
          // Log what we got from authentication
          console.log('Login user object:', {
            hasIsAdmin: 'isAdmin' in user,
            isAdminType: typeof user.isAdmin,
            isAdmin: user.isAdmin,
            hasIsEmployee: 'isEmployee' in user,
            isEmployeeType: typeof user.isEmployee,
            isEmployee: user.isEmployee
          });
          
          const userData = {
            id: user.id,
            username: user.username,
            email: user.email || '',
            // Ensure we're using the properly converted booleans from the authentication process
            isAdmin: user.isAdmin === true,
            isEmployee: user.isEmployee === true,
            userGroup: user.userGroup || '',
            kycStatus: user.kycStatus || 'pending',
            fullName: user.fullName || '',
            balances: user.balances // Added balances here
          };

          console.log('Login successful for user:', {
            id: userData.id,
            username: userData.username,
            isAdmin: userData.isAdmin,
            isEmployee: userData.isEmployee,
            userGroup: userData.userGroup
          });

          return res.json(userData);
        });
      })(req, res, next);
    });

  app.post("/api/logout", async (req, res) => {
    try {
      // Get the current session ID before logout
      const sessionId = req.sessionID;
      const userId = req.user?.id;
      
      console.log(`Logging out user ${userId} with session ${sessionId}`);
      
      // If we have a session ID, remove it from database
      if (sessionId) {
        try {
          await db.delete(userSessions)
            .where(eq(userSessions.session_id, sessionId));
          console.log(`Removed session ${sessionId} from database`);
        } catch (dbError) {
          console.error('Error removing session from database:', dbError);
          // Continue with logout even if DB operation fails
        }
      }
      
      // Then perform passport logout
      req.logout((err) => {
        if (err) {
          console.error('Logout error:', err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.json({ 
          success: true,
          message: "Logout successful",
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error('Logout process error:', error);
      res.status(500).json({ 
        success: false,
        message: "Logout process failed",
        timestamp: new Date().toISOString() 
      });
    }
  });

  app.get("/api/user", (req, res) => {
    console.log('User info request:', {
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? {
        id: req.user.id,
        username: req.user.username,
        isAdmin: req.user.isAdmin,
        isEmployee: req.user.isEmployee,
        userGroup: req.user.userGroup
      } : null
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Add Cache-Control headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    res.json(req.user);
  });
}