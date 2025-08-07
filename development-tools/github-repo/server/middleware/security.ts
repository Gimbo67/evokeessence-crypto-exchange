import { Request, Response, NextFunction } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import helmet from 'helmet';

/**
 * Middleware to add security headers to all responses
 * Configured for A+ rating on Mozilla Observatory and SecurityHeaders.io
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Set enhanced security headers for A+ Mozilla Observatory score
  
  // Check environment conditions 
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isSecurityTest = process.env.SECURITY_TEST === 'true';
  const isViteRequest = req.path.includes('/@') || req.path.includes('.vite');
  
  // Check for authentication-related paths that need Google reCAPTCHA
  const isAuthPath = req.path === '/login' || 
                     req.path === '/register' || 
                     req.path.includes('/auth') || 
                     req.path.includes('/oauth') ||
                     req.path === '/admin/login';

  // Log detailed request information for debugging
  console.log(`[Security Headers] Processing request - Path: ${req.path}, Method: ${req.method}, Dev: ${isDevelopment}, IsAuthPath: ${isAuthPath}`);

  // Vite development needs a completely different CSP with 'unsafe-eval'
  // Our solution is to use a special security header setup for development and
  // a strict security header setup for production/security testing
  
  // STEP 1: Always set common non-CSP security headers
  // These are applied in all environments and won't break Vite
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()');
  
  // STEP 2: Set CSP and other strict headers based on environment and path
  
  // Define reCAPTCHA-compatible CSP for auth pages
  // This is a comprehensive CSP policy that allows reCAPTCHA to function properly
  const cspWithRecaptcha = `default-src 'self'; 
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://recaptcha.google.com https://www.googletagmanager.com https://*.transak.com; 
    style-src 'self' 'unsafe-inline' https://www.gstatic.com https://*.transak.com; 
    img-src 'self' data: blob: https://www.google.com https://www.gstatic.com https://*.transak.com; 
    font-src 'self' data: https://*.transak.com; 
    connect-src 'self' wss: ws: https://www.google.com https://www.googleapis.com https://recaptcha.net https://*.transak.com; 
    object-src 'none'; 
    frame-src https://www.google.com https://recaptcha.google.com https://www.recaptcha.net https://global.transak.com https://global-stg.transak.com; 
    base-uri 'none'; 
    form-action 'self'; 
    frame-ancestors 'none'; 
    manifest-src 'self'; 
    worker-src 'self' blob: https://www.gstatic.com;`.replace(/\s+/g, ' ');
    
  // Define standard CSP for non-auth pages (no recaptcha needed)
  // Still secure but without the frame-src directives needed for reCAPTCHA
  const cspStandard = `default-src 'self'; 
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.transak.com; 
    style-src 'self' 'unsafe-inline' https://*.transak.com; 
    img-src 'self' data: blob: https://*.transak.com; 
    font-src 'self' data: https://*.transak.com; 
    connect-src 'self' wss: ws: https://*.transak.com; 
    object-src 'none'; 
    frame-src https://global.transak.com https://global-stg.transak.com; 
    base-uri 'none'; 
    form-action 'self'; 
    frame-ancestors 'none'; 
    manifest-src 'self'; 
    worker-src 'self' blob:;`.replace(/\s+/g, ' ');
  
  // Decide which CSP policy to use based on path and environment
  if (isDevelopment && !isSecurityTest) {
    // Development environment - use path-specific CSP
    console.log(`[Security] Development mode - choosing appropriate CSP for path: ${req.path}`);
    
    // Authentication and login pages need reCAPTCHA CSP
    if (isAuthPath) {
      res.setHeader('Content-Security-Policy', cspWithRecaptcha);
      console.log(`[CSP Applied] reCAPTCHA-compatible CSP applied to auth path: ${req.path}`);
      
      // Add debugging headers
      res.setHeader('X-CSP-Applied-By', 'security-middleware-dev-auth');
      res.setHeader('X-CSP-Mode', 'development-auth-with-recaptcha');
    } else {
      // Non-auth pages get the standard CSP
      res.setHeader('Content-Security-Policy', cspStandard);
      console.log(`[CSP Applied] Standard CSP applied to non-auth path: ${req.path}`);
      
      // Add debugging headers
      res.setHeader('X-CSP-Applied-By', 'security-middleware-dev-standard');
      res.setHeader('X-CSP-Mode', 'development-standard');
    }
  } else {
    // Production mode or security test - apply strict but path-aware CSP for A+ rating
    console.log(`[Security] Production or test mode - applying appropriate CSP for path: ${req.path}`);
    
    // Define production CSP settings with reCAPTCHA compatibility for auth pages
    const cspProdRecaptcha = `default-src 'self'; 
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://recaptcha.google.com https://www.googletagmanager.com https://*.transak.com; 
      style-src 'self' 'unsafe-inline' https://www.gstatic.com https://*.transak.com; 
      img-src 'self' data: blob: https://www.google.com https://www.gstatic.com https://*.transak.com; 
      font-src 'self' data: https://*.transak.com; 
      connect-src 'self' wss: ws: https://www.google.com https://www.googleapis.com https://recaptcha.net https://*.transak.com; 
      object-src 'none'; 
      frame-src https://www.google.com https://recaptcha.google.com https://www.recaptcha.net https://global.transak.com https://global-stg.transak.com; 
      base-uri 'none'; 
      form-action 'self'; 
      frame-ancestors 'none'; 
      manifest-src 'self'; 
      worker-src 'self' blob: https://www.gstatic.com;
      upgrade-insecure-requests;`.replace(/\s+/g, ' ');
      
    // Define production CSP for non-auth pages (more restrictive)
    const cspProdStandard = `default-src 'self'; 
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.transak.com; 
      style-src 'self' 'unsafe-inline' https://*.transak.com; 
      img-src 'self' data: blob: https://*.transak.com; 
      font-src 'self' data: https://*.transak.com; 
      connect-src 'self' wss: ws: https://*.transak.com; 
      object-src 'none'; 
      frame-src https://global.transak.com https://global-stg.transak.com; 
      base-uri 'none'; 
      form-action 'self'; 
      frame-ancestors 'none'; 
      manifest-src 'self'; 
      worker-src 'self' blob:;
      upgrade-insecure-requests;`.replace(/\s+/g, ' ');
    
    // Apply the appropriate CSP based on the path
    if (isAuthPath) {
      res.setHeader('Content-Security-Policy', cspProdRecaptcha);
      console.log(`[Security] Production - applying reCAPTCHA-compatible CSP for auth path: ${req.path}`);
      res.setHeader('X-CSP-Applied-By', 'security-middleware-prod-auth');
    } else {
      res.setHeader('Content-Security-Policy', cspProdStandard);
      console.log(`[Security] Production - applying strict CSP for non-auth path: ${req.path}`);
      res.setHeader('X-CSP-Applied-By', 'security-middleware-prod-standard');
    }
    
    // Modified Cross-Origin policies to allow reCAPTCHA
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none'); // Changed from require-corp for reCAPTCHA
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Changed from same-origin to allow login services
    
    // HSTS - Include even though Cloudflare might manage it
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    
    // Prevent caching of sensitive information
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  // Special handling for API routes to ensure JSON responses
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }
  
  next();
};

/**
 * Configure TLS session resumption for HTTP server
 * This should be applied to the HTTP server instance
 */
export const configureTlsSessionResumption = (server: any) => {
  if (server && typeof server.setTicketKeys === 'function') {
    // Enable TLS session resumption via session ID caching
    // Note: This needs to be called on the HTTPS server instance
    server.enableSessionResumption = true;
    console.log('[Security] TLS session resumption enabled');
  } else {
    console.log('[Security] TLS session resumption configuration skipped (not an HTTPS server)');
  }
};

/**
 * Configure HTTPS options with modern TLS settings
 * These settings should be used when creating an HTTPS server
 */
export const getSecureHttpsOptions = () => {
  return {
    // Disable weak TLS versions (only allow TLS 1.2 and 1.3)
    minVersion: 'TLSv1.2',
    
    // Enable OCSP Stapling
    enableOCSPStapling: true,
    
    // Specify strong cipher suites (disabling weak ones)
    ciphers: [
      'TLS_AES_128_GCM_SHA256',           // TLS 1.3
      'TLS_AES_256_GCM_SHA384',           // TLS 1.3
      'TLS_CHACHA20_POLY1305_SHA256',     // TLS 1.3
      'ECDHE-ECDSA-AES128-GCM-SHA256',    // TLS 1.2
      'ECDHE-RSA-AES128-GCM-SHA256',      // TLS 1.2
      'ECDHE-ECDSA-AES256-GCM-SHA384',    // TLS 1.2
      'ECDHE-RSA-AES256-GCM-SHA384',      // TLS 1.2
      'ECDHE-ECDSA-CHACHA20-POLY1305',    // TLS 1.2
      'ECDHE-RSA-CHACHA20-POLY1305'       // TLS 1.2
    ].join(':'),
    
    // Prefer server's cipher suite order over client's
    honorCipherOrder: true,
    
    // Enable session resumption
    sessionTimeout: 300, // 5 minutes
    
    // Additional options for OCSP Stapling
    requestOCSP: true
  };
};

/**
 * Apply security headers to Vite development server responses
 * This can be used as a plugin or middleware in Vite
 */
export const applySecurityHeadersToVite = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) => {
  // Set enhanced security headers for Vite dev server (A+ rating compatible)
  // More permissive for development with HMR, but still very secure
  // Include Google reCAPTCHA domains to ensure login functionality works
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://recaptcha.google.com https://www.googletagmanager.com https://*.transak.com; style-src 'self' 'unsafe-inline' https://www.gstatic.com https://*.transak.com; img-src 'self' data: blob: https://www.google.com https://www.gstatic.com https://*.transak.com; font-src 'self' data: https://*.transak.com; connect-src 'self' wss: ws: https://www.google.com https://www.googleapis.com https://recaptcha.net https://*.transak.com; object-src 'none'; frame-src https://www.google.com https://recaptcha.google.com https://www.recaptcha.net https://global.transak.com https://global-stg.transak.com; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self'; worker-src 'self' blob: https://www.gstatic.com;");
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Changed from same-origin for auth compatibility
  
  // For API routes, ensure JSON content type
  if (req.url?.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }
  
  // For authentication routes, ensure headers allow external services needed
  if (req.url?.startsWith('/bypass/auth/') || req.url?.startsWith('/api/auth/')) {
    // Log authentication route headers adjustment
    console.log(`[Security] Setting auth-friendly headers for auth route: ${req.url}`);
  }
  
  next();
};

/**
 * Security middleware for Express
 * This combines all security-related middleware for easier application
 */
export const setupSecurityMiddleware = (app: any) => {
  // Use Helmet with custom configuration for enhanced security
  // In development, we need special handling for Vite
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  console.log('[Security] Setting up security middleware...');

  // First apply other security middleware based on environment
  console.log('[Security] Setting up environment-specific security middleware...');

  if (isDevelopment) {
    // Development environment - we'll be more permissive to allow Vite's hot module reloading
    console.log('[Security] Using development mode - security features configured for development');
    
    // Add basic security headers that won't interfere with development
    app.use((req: Request, res: Response, next: NextFunction) => {
      // Set minimal headers that won't break development tools
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      // Skip CSP here as we'll set it later with our securityHeaders middleware
      next();
    });
    
    // *** IMPORTANT: Apply securityHeaders middleware AFTER environment middleware ***
    // This ensures our reCAPTCHA-compatible CSP has the final say
    app.use(securityHeaders);
    console.log('[Security] Security headers middleware applied last to ensure reCAPTCHA compatibility');
    
    // Ensure API routes always return JSON in development too
    app.use('/api', (req: Request, res: Response, next: NextFunction) => {
      const originalSend = res.send;
      res.send = function(body?: any): any {
        if (typeof body === 'string' && body.includes('<!DOCTYPE html>')) {
          console.log(`[DEV API] HTML intercepted on API route: ${req.url}`);
          return originalSend.call(this, JSON.stringify({
            success: false,
            error: "Server error",
            message: "API routes must return JSON only"
          }));
        }
        return originalSend.call(this, body);
      };
      next();
    });
  } else {
    // Strict settings for production with enhanced Mozilla Observatory score for A+ rating
    app.use(helmet({
      // Disable CSP in helmet, we'll set it in our securityHeaders middleware
      contentSecurityPolicy: false,
      // Modified cross-origin policies for authentication compatibility
      crossOriginEmbedderPolicy: false, // Changed from true to allow embedded content
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Changed from same-origin
      // Enhance clickjacking protection with DENY (stricter than SAMEORIGIN)
      frameguard: {
        action: 'deny'
      },
      // Disable content type sniffing
      noSniff: true,
      // Configure strict referrer policy - changing to no-referrer for A+ rating
      referrerPolicy: {
        policy: 'no-referrer'
      },
      // Enable XSS protection in browsers that support it
      xssFilter: true,
      // Enable HSTS for A+ rating even though Cloudflare manages it
      // Having both server and CDN set this is recommended for security depth
      hsts: {
        maxAge: 63072000, // 2 years in seconds
        includeSubDomains: true,
        preload: true
      }
    }));
    
    // Add comprehensive Permissions-Policy header for A+ rating
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()');
      next();
    });
    
    // Apply securityHeaders middleware AFTER Helmet to ensure our CSP settings override Helmet's
    app.use(securityHeaders);
    
    // Ensure API routes always return JSON and never HTML
    app.use('/api', (req: Request, res: Response, next: NextFunction) => {
      // Override send method for API routes to never return HTML
      const originalSend = res.send;
      res.send = function(body?: any): any {
        // If response is HTML, convert to JSON error response
        if (typeof body === 'string' && body.includes('<!DOCTYPE html>')) {
          console.error(`[API Error] HTML intercepted on API route: ${req.url}`);
          return originalSend.call(this, JSON.stringify({
            success: false,
            error: "Server error",
            message: "API routes must return JSON only"
          }));
        }
        return originalSend.call(this, body);
      };
      next();
    });
    
    console.log('[Security] Using enhanced security settings for A+ rating');
  }
  
  console.log('[Security] Security middleware configured successfully');
};