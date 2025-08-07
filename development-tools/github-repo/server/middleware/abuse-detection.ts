import { Request, Response, NextFunction } from 'express';
import { rateLimit } from 'express-rate-limit';
import fs from 'fs-extra';
import path from 'path';
import { createTransport } from 'nodemailer';
import { format } from 'date-fns';

// File paths for banned IPs and abuse log
const BANNED_IPS_FILE = path.join(process.cwd(), 'banned-ips.json');
const ABUSE_LOG_FILE = path.join(process.cwd(), 'abuse.log');

// Constants for security configuration
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || '6LejmAArAAAAAGQCIXTNi13_PLoOFeQD7vfGgF7t';
const DEFAULT_BAN_DURATION = 3600000; // 1 hour in milliseconds
const REPEAT_OFFENDER_MULTIPLIER = 6; // Increased ban duration multiplier (up to 6 hours) for repeat offenders 
const NOTIFICATION_THRESHOLD = 2; // Lowered threshold to notify admins sooner
const RECAPTCHA_SCORE_THRESHOLD = 0.5; // Minimum acceptable reCAPTCHA score

// Track repeat offenders
const repeatOffenders: Record<string, number> = {};

// Initialize the files if they don't exist
const initFiles = async () => {
  try {
    // Check if banned IPs file exists, if not create it with an empty array
    if (!await fs.pathExists(BANNED_IPS_FILE)) {
      await fs.writeJson(BANNED_IPS_FILE, { 
        bannedIps: {},
        updatedAt: new Date().toISOString()
      });
      console.log('[Security] Created empty banned IPs file');
    }

    // Check if abuse log file exists, if not create it
    if (!await fs.pathExists(ABUSE_LOG_FILE)) {
      await fs.ensureFile(ABUSE_LOG_FILE);
      console.log('[Security] Created empty abuse log file');
    }
  } catch (error: any) {
    console.error('[Security] Error initializing security files:', error);
    const errorMessage = error?.message || 'Unknown error';
  }
};

// Initialize files at startup
initFiles().catch(console.error);

// Load banned IPs from file
export const getBannedIps = async (): Promise<Record<string, number>> => {
  try {
    if (await fs.pathExists(BANNED_IPS_FILE)) {
      const data = await fs.readJson(BANNED_IPS_FILE);
      return data.bannedIps || {};
    }
    return {};
  } catch (error: any) {
    console.error('[Security] Error loading banned IPs:', error);
    const errorMessage = error?.message || 'Unknown error';
    console.log(`[Security] Failed to load banned IPs: ${errorMessage}`);
    return {};
  }
};

// Save banned IPs to file
export const saveBannedIps = async (bannedIps: Record<string, number>): Promise<void> => {
  try {
    await fs.writeJson(BANNED_IPS_FILE, { 
      bannedIps,
      updatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[Security] Error saving banned IPs:', error);
    const errorMessage = error?.message || 'Unknown error';
    console.log(`[Security] Failed to save banned IPs: ${errorMessage}`);
  }
};

// Log to abuse.log file
export const logAbuse = async (message: string): Promise<void> => {
  try {
    const timestamp = format(new Date(), '[yyyy-MM-dd HH:mm:ss]');
    const logEntry = `${timestamp} ${message}\n`;
    await fs.appendFile(ABUSE_LOG_FILE, logEntry);
  } catch (error: any) {
    console.error('[Security] Error logging abuse:', error);
    const errorMessage = error?.message || 'Unknown error';
    console.log(`[Security] Failed to log abuse: ${errorMessage}`);
  }
};

// Check if an IP is banned
export const isIpBanned = async (ip: string): Promise<boolean> => {
  try {
    const bannedIps = await getBannedIps();
    const banTime = bannedIps[ip];
    
    if (banTime) {
      // Check if ban has expired (ban time is 1 hour = 3600000 ms)
      if (Date.now() < banTime) {
        return true;
      } else {
        // Ban has expired, remove IP from banned list
        const updatedBannedIps = { ...bannedIps };
        delete updatedBannedIps[ip];
        await saveBannedIps(updatedBannedIps);
        await logAbuse(`IP ${ip} ban expired and removed automatically`);
        return false;
      }
    }
    return false;
  } catch (error: any) {
    console.error('[Security] Error checking banned IP:', error);
    const errorMessage = error?.message || 'Unknown error';
    console.log(`[Security] Failed to check banned IP ${ip}: ${errorMessage}`);
    return false;
  }
};

// Ban an IP address with progressive ban duration for repeat offenders
export const banIp = async (ip: string): Promise<void> => {
  try {
    const bannedIps = await getBannedIps();
    
    // Track repeat offenders and increase ban duration accordingly
    if (!repeatOffenders[ip]) {
      repeatOffenders[ip] = 1;
    } else {
      repeatOffenders[ip]++;
    }
    
    // Calculate ban duration - increase for repeat offenders
    const banMultiplier = Math.min(repeatOffenders[ip], REPEAT_OFFENDER_MULTIPLIER);
    const banDuration = DEFAULT_BAN_DURATION * banMultiplier;
    const banExpiryTime = Date.now() + banDuration;
    
    const updatedBannedIps = { ...bannedIps, [ip]: banExpiryTime };
    
    // Update banned IPs file and log the ban with duration info
    await saveBannedIps(updatedBannedIps);
    await logAbuse(`Blocked IP ${ip} - Too many login attempts. Ban duration: ${banDuration/60000} minutes (Offense #${repeatOffenders[ip]})`);
    
    // Only send email alert for significant offenses or based on threshold
    if (repeatOffenders[ip] >= NOTIFICATION_THRESHOLD) {
      await sendBanAlert(ip, repeatOffenders[ip], banDuration);
    }
  } catch (error: any) {
    console.error('[Security] Error banning IP:', error);
    const errorMessage = error?.message || 'Unknown error';
    console.log(`[Security] Failed to ban IP ${ip}: ${errorMessage}`);
  }
};

// Unban an IP address
export const unbanIp = async (ip: string, adminUser?: string): Promise<boolean> => {
  try {
    const bannedIps = await getBannedIps();
    
    if (bannedIps[ip]) {
      const updatedBannedIps = { ...bannedIps };
      delete updatedBannedIps[ip];
      
      // Update banned IPs file and log the unban
      await saveBannedIps(updatedBannedIps);
      await logAbuse(`IP ${ip} unbanned by ${adminUser || 'admin'}`);
      return true;
    }
    return false;
  } catch (error: any) {
    console.error('[Security] Error unbanning IP:', error);
    const errorMessage = error?.message || 'Unknown error';
    console.log(`[Security] Failed to unban IP ${ip}: ${errorMessage}`);
    return false;
  }
};

// Check failed login attempts
interface FailedLoginAttempts {
  [ip: string]: {
    count: number;
    firstAttempt: number;
    showCaptcha: boolean;
  };
}

let failedLoginAttempts: FailedLoginAttempts = {};

// Clean up old failed login attempts every 30 minutes
setInterval(() => {
  const now = Date.now();
  const tenMinutesAgo = now - 10 * 60 * 1000;
  
  Object.keys(failedLoginAttempts).forEach(ip => {
    if (failedLoginAttempts[ip].firstAttempt < tenMinutesAgo) {
      delete failedLoginAttempts[ip];
    }
  });
  
  console.log('[Security] Cleaned up failed login attempts tracker');
}, 30 * 60 * 1000);

// Record a failed login attempt
export const recordFailedLoginAttempt = async (ip: string): Promise<{ showCaptcha: boolean; banned: boolean }> => {
  // Initialize if this is the first failed attempt from this IP
  if (!failedLoginAttempts[ip]) {
    failedLoginAttempts[ip] = {
      count: 0,
      firstAttempt: Date.now(),
      showCaptcha: false
    };
  }
  
  failedLoginAttempts[ip].count += 1;
  
  // After 3 failed attempts, show CAPTCHA
  if (failedLoginAttempts[ip].count >= 3 && !failedLoginAttempts[ip].showCaptcha) {
    failedLoginAttempts[ip].showCaptcha = true;
  }
  
  // After 5 failed attempts, ban the IP
  if (failedLoginAttempts[ip].count >= 5) {
    await banIp(ip);
    delete failedLoginAttempts[ip]; // Reset counter after ban
    return { showCaptcha: true, banned: true };
  }
  
  return { showCaptcha: failedLoginAttempts[ip].showCaptcha, banned: false };
};

// Reset failed login attempts after successful login
export const resetFailedLoginAttempts = (ip: string): void => {
  delete failedLoginAttempts[ip];
};

// Check if CAPTCHA should be shown
export const shouldShowCaptcha = (ip: string): boolean => {
  return !!(failedLoginAttempts[ip] && failedLoginAttempts[ip].showCaptcha);
};

// Nodemailer setup for alerts with enhanced information
const sendBanAlert = async (ip: string, offenseCount = 1, banDuration = DEFAULT_BAN_DURATION): Promise<void> => {
  try {
    // Create a nodemailer transporter
    const transporter = createTransport({
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'noreply@evo-exchange.com',
        pass: process.env.SMTP_PASS || ''
      }
    });

    // Format duration in more readable format
    const durationInMinutes = banDuration / 60000;
    const durationInHours = durationInMinutes / 60;
    
    // Create a more descriptive alert subject for repeat offenders
    const subject = offenseCount > 1 
      ? `URGENT Security Alert: Repeat Offender IP Blocked (Offense #${offenseCount})` 
      : 'Security Alert: IP Blocked';
    
    // Create more detailed alert with security recommendations for serious threats
    const securityRecommendations = offenseCount >= 3 
      ? `<p>⚠️ <strong>Security Recommendations:</strong></p>
         <ul>
           <li>Consider blocking this IP at the infrastructure level</li>
           <li>Review logs for other malicious activities from this IP</li>
           <li>Consider implementing geo-blocking if attacks come from specific regions</li>
         </ul>` 
      : '';

    // Send email alert with enhanced information
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@evo-exchange.com',
      to: process.env.ALERT_EMAIL || 'noreply@evo-exchange.com',
      subject: subject,
      text: `IP ${ip} was blocked after exceeding login attempts.\nOffense count: ${offenseCount}\nBan duration: ${durationInMinutes.toFixed(1)} minutes (${durationInHours.toFixed(2)} hours)\nTime: ${new Date().toISOString()}`,
      html: `<p>IP <strong>${ip}</strong> was blocked after exceeding login attempts.</p>
             <p><strong>Offense count:</strong> ${offenseCount}</p>
             <p><strong>Ban duration:</strong> ${durationInMinutes.toFixed(1)} minutes (${durationInHours.toFixed(2)} hours)</p>
             <p><strong>Time:</strong> ${new Date().toISOString()}</p>
             ${securityRecommendations}
             <p>Please check the admin dashboard for more details.</p>`
    });

    console.log('[Security] Sent email alert for banned IP:', ip, `(Offense #${offenseCount})`);
  } catch (error: any) {
    console.error('[Security] Error sending email alert:', error);
    const errorMessage = error?.message || 'Unknown error';
    console.log(`[Security] Failed to send email alert for IP ${ip}: ${errorMessage}`);
  }
};

// Middleware to block banned IPs
export const bannedIpMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  try {
    // Check if the IP is banned
    if (await isIpBanned(ip)) {
      console.log(`[Security] Blocked request from banned IP: ${ip}`);
      res.status(403).send('Access Forbidden - Your IP has been temporarily blocked due to too many failed login attempts.');
      return;
    }
  } catch (error: any) {
    console.error('[Security] Error in bannedIpMiddleware:', error);
    const errorMessage = error?.message || 'Unknown error';
    console.log(`[Security] Failed to check if IP ${ip} is banned: ${errorMessage}`);
  }
  
  next();
};

// Rate limiter middleware for login
export const loginRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // Maximum 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts, please try again later',
  handler: async (req, res, _next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    
    // This is an additional safeguard beyond our custom implementation
    console.log(`[Security] Rate limit exceeded by IP: ${ip}`);
    await logAbuse(`Rate limit exceeded by IP ${ip}`);
    
    res.status(429).send('Too many login attempts from this IP, please try again later');
  }
});

// Validate Google reCAPTCHA token with enhanced monitoring and logging
export const validateRecaptcha = async (token: string, action: string, ip: string, headers?: any): Promise<boolean> => {
  try {
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Log environment info
    console.log(`[Security] reCAPTCHA validation running in ${isDevelopment ? 'development' : 'production'} mode`);
    console.log(`[Security] reCAPTCHA secret key available: ${!!RECAPTCHA_SECRET_KEY}`);
    
    // Check if the request is from iOS app (if headers are provided)
    const isIOSApp = headers && (headers['x-ios-app'] === 'true' || headers['x-app-platform'] === 'ios');
    if (isIOSApp) {
      const appVersion = headers['x-app-version'] || 'unknown';
      console.log(`[Security] reCAPTCHA validation BYPASSED for iOS app (v${appVersion}) from IP ${ip}`);
      return true;
    }
    
    // TEMPORARY BYPASS: always return true to allow login regardless of reCAPTCHA
    console.log('[Security] ⚠️ reCAPTCHA validation BYPASSED to allow login');
    return true;
    
    /* VALIDATION DISABLED AS REQUESTED BY USER
    
    // DEVELOPMENT MODE ENHANCEMENTS - For testing purposes
    if (isDevelopment) {
      console.log('[Security] Development mode detected - relaxing reCAPTCHA validation requirements');
      
      // List of known test tokens that will be auto-approved in dev mode
      const devTestTokens = [
        'test-recaptcha-token', 
        'dummy-token-for-dev', 
        'dev-mode-token',
        'test-token',
        '03AFcWeA6C43Q5OG_BDjcKvlVW_vRajjKwX7C',  // Common start for test tokens
      ];
      
      // Empty or null token in dev mode is ok
      if (!token || token.trim() === '') {
        console.log('[Security] Empty reCAPTCHA token in development - automatically approved');
        return true;
      }
      
      // Check if token is in our list of known dev tokens
      for (const testToken of devTestTokens) {
        if (token === testToken || token.startsWith(testToken)) {
          console.log(`[Security] Development token detected (${testToken}) - automatically approved`);
          return true;
        }
      }
      
      // Always accept any token in development
      console.log('[Security] Development mode - accepting all tokens regardless of verification');
      return true;
    }
    
    // PRODUCTION VALIDATION LOGIC
    if (!token) {
      console.log('[Security] No reCAPTCHA token provided');
      await logAbuse(`reCAPTCHA validation failed for IP ${ip}: No token provided`);
      return false;
    }
    */

    const secret = RECAPTCHA_SECRET_KEY;
    
    // Try to avoid doing real API calls in development
    if (!isDevelopment) {
      console.log(`[Security] Verifying reCAPTCHA token with Google API: ${token.substring(0, 10)}...`);
      
      try {
        const axios = require('axios');
        const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
          params: {
            secret,
            response: token,
            remoteip: ip
          }
        });

        const { success, score, action: tokenAction, hostname, challenge_ts } = response.data;

        // Log the response for debugging
        console.log('[Security] reCAPTCHA verification response:', {
          success,
          score,
          action: tokenAction,
          expectedAction: action,
          hostname,
          timestamp: challenge_ts
        });

        // Enhanced validation with configurable threshold
        if (!success) {
          await logAbuse(`reCAPTCHA validation failed for IP ${ip}: API returned success=false`);
          return false;
        }
        
        if (score < RECAPTCHA_SCORE_THRESHOLD) {
          await logAbuse(`reCAPTCHA validation failed for IP ${ip}: Low score (${score} < ${RECAPTCHA_SCORE_THRESHOLD})`);
          
          // Record potentially suspicious activity for very low scores
          if (score < 0.2) {
            await logAbuse(`SUSPICIOUS ACTIVITY: Very low reCAPTCHA score (${score}) from IP ${ip}`);
            
            // Consider adding to repeat offenders list for monitoring
            if (!repeatOffenders[ip]) {
              repeatOffenders[ip] = 1;
            }
          }
          
          return false;
        }
        
        if (tokenAction !== action) {
          await logAbuse(`reCAPTCHA validation failed for IP ${ip}: Action mismatch (${tokenAction} vs ${action})`);
          return false;
        }

        return true;
      } catch (error: any) {
        console.error('[Security] Error in reCAPTCHA API validation:', error);
        const errorMessage = error?.message || 'Unknown error';
        await logAbuse(`reCAPTCHA API validation error for IP ${ip}: ${errorMessage}`);
        // In production, fail closed on errors
        return false;
      }
    }

    // Should never reach here in production, but added as a safety fallback
    return isDevelopment;
  } catch (error: any) {
    console.error('[Security] Critical error in validateRecaptcha:', error);
    const errorMessage = error?.message || 'Unknown error';
    await logAbuse(`Critical reCAPTCHA validation error for IP ${ip}: ${errorMessage}`);
    
    // In development, allow requests even if reCAPTCHA validation fails
    // In production, fail closed on errors
    return process.env.NODE_ENV === 'development';
  }
};

// Middleware for validating reCAPTCHA v2 checkbox with enhanced logging and error handling
export const recaptchaV2Middleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const endpoint = req.path || 'unknown endpoint';
  
  // Check for iOS app-specific header or token
  const isIOSApp = req.headers['x-ios-app'] === 'true' || req.headers['x-app-platform'] === 'ios';
  const appVersion = req.headers['x-app-version'] || 'unknown';
  
  // Skip reCAPTCHA for iOS app requests
  if (isIOSApp) {
    console.log(`[Security] reCAPTCHA bypass allowed for iOS app (v${appVersion}) from IP ${ip} at ${endpoint}`);
    next();
    return;
  }
  
  // TEMPORARY BYPASS: Skip reCAPTCHA verification to allow logins
  // This allows testing and development to continue while implementing iOS app
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Security] ⚠️ CAPTCHA validation BYPASSED in development for IP ${ip} at ${endpoint}`);
    next();
    return;
  }
  
  /* VALIDATION DISABLED AS REQUESTED BY USER
  // Only apply if CAPTCHA should be shown based on previous failed attempts
  if (shouldShowCaptcha(ip)) {
    const recaptchaResponse = req.body['g-recaptcha-response'];
    
    if (!recaptchaResponse) {
      console.log(`[Security] CAPTCHA required but not provided for IP ${ip} at ${endpoint}`);
      await logAbuse(`CAPTCHA required but not provided for IP ${ip} at ${endpoint}`);
      
      res.status(403).json({ 
        success: false, 
        message: 'Please complete the CAPTCHA verification',
        requireCaptcha: true
      });
      return;
    }
    
    try {
      const secret = RECAPTCHA_SECRET_KEY;
      const axios = require('axios');
      
      console.log(`[Security] Validating CAPTCHA for IP ${ip} at ${endpoint}`);
      
      const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
        params: {
          secret,
          response: recaptchaResponse,
          remoteip: ip
        }
      });
      
      // Log the complete response for debugging while removing sensitive data
      const sanitizedResponse = { ...response.data };
      delete sanitizedResponse.hostname; // Remove potentially sensitive domain info
      console.log('[Security] reCAPTCHA V2 verification response:', sanitizedResponse);
      
      if (!response.data.success) {
        await logAbuse(`CAPTCHA verification failed for IP ${ip} at ${endpoint}`);
        
        // Track potential CAPTCHA bypass attempts
        if (repeatOffenders[ip]) {
          repeatOffenders[ip]++;
          
          // If we're seeing multiple failed CAPTCHA attempts, this might be a CAPTCHA bypass attempt
          if (repeatOffenders[ip] >= 3) {
            await logAbuse(`SUSPICIOUS ACTIVITY: Multiple failed CAPTCHA attempts from IP ${ip}`);
            
            // Consider banning for repeated CAPTCHA failures
            if (repeatOffenders[ip] >= 5) {
              await banIp(ip);
              res.status(403).send('Access Forbidden - Your IP has been temporarily blocked due to suspicious activity.');
              return;
            }
          }
        } else {
          repeatOffenders[ip] = 1;
        }
        
        res.status(403).json({ 
          success: false, 
          message: 'CAPTCHA verification failed',
          requireCaptcha: true
        });
        return;
      }
      
      console.log(`[Security] CAPTCHA verification successful for IP ${ip}`);
    } catch (error: any) {
      console.error('[Security] Error validating CAPTCHA:', error);
      const errorMessage = error?.message || 'Unknown error';
      await logAbuse(`CAPTCHA validation error for IP ${ip}: ${errorMessage}`);
      
      res.status(500).json({ 
        success: false, 
        message: 'Error validating CAPTCHA',
        requireCaptcha: true
      });
      return;
    }
  }
  */
  
  // For now, we'll bypass for all clients but in production, you'd want to enforce reCAPTCHA for web clients
  console.log(`[Security] ⚠️ CAPTCHA validation BYPASSED for IP ${ip} at ${endpoint}`);
  next();
};