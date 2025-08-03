/**
 * Production Security Testing Script
 * 
 * This script runs a minimal Express server with production-grade security headers
 * to verify that the A+ rated security configuration works correctly in production mode.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';

// Force production mode
process.env.NODE_ENV = 'production';
process.env.SECURITY_TEST = 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create express app
const app = express();
const PORT = 5001;

console.log(`[Security Test] Running in production mode: NODE_ENV=${process.env.NODE_ENV}`);

// Apply custom security headers middleware
app.use((req, res, next) => {
  // Production mode - apply strict CSP for A+ rating with reCAPTCHA support
  // Note: 'unsafe-inline' and 'unsafe-eval' are required for reCAPTCHA to function correctly
  const cspProd = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com https://recaptcha.google.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://www.gstatic.com; img-src 'self' data: blob: https://www.google.com https://www.gstatic.com; font-src 'self' data:; connect-src 'self' wss: ws: https://www.google.com https://www.googleapis.com https://recaptcha.net; object-src 'none'; frame-src https://www.google.com https://recaptcha.google.com https://www.recaptcha.net; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self'; worker-src 'self' blob: https://www.gstatic.com; upgrade-insecure-requests;";
  res.setHeader('Content-Security-Policy', cspProd);
  
  // Other important security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  
  // Cross-Origin policies - stricter in production
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  
  next();
});
console.log('[Security Test] Applied custom security headers middleware');

// Apply Helmet with strict CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.google.com", "https://www.gstatic.com", "https://recaptcha.google.com", "https://www.googletagmanager.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://www.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://www.google.com", "https://www.gstatic.com"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "wss:", "ws:", "https://www.google.com", "https://www.googleapis.com", "https://recaptcha.net"],
      objectSrc: ["'none'"],
      frameSrc: ["https://www.google.com", "https://recaptcha.google.com", "https://www.recaptcha.net"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:", "https://www.gstatic.com"],
      upgradeInsecureRequests: []
    }
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true,
  hsts: {
    maxAge: 63072000,
    includeSubDomains: true,
    preload: true
  }
}));
console.log('[Security Test] Applied Helmet with strict CSP');

// Route for testing security headers
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Production Security Headers Test</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }
        h1 {
          color: #333;
        }
        .info {
          background: #f5f5f5;
          padding: 1rem;
          border-radius: 5px;
          margin-bottom: 1rem;
        }
        .success {
          color: green;
          font-weight: bold;
        }
        code {
          background: #eee;
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
        }
      </style>
    </head>
    <body>
      <h1>Production Security Headers Test</h1>
      <div class="info">
        <p class="success">✓ Running in production mode with A+ grade security headers</p>
        <p>This is a test server for verifying production security headers. It applies security headers required for an A+ rating on Mozilla Observatory and SecurityHeaders.io while allowing Google reCAPTCHA to function.</p>
        <p>Current headers applied:</p>
        <ul>
          <li><strong>Content-Security-Policy:</strong> Strict configuration with reCAPTCHA domains allowed</li>
          <li><strong>X-Frame-Options:</strong> DENY</li>
          <li><strong>X-Content-Type-Options:</strong> nosniff</li>
          <li><strong>Referrer-Policy:</strong> no-referrer</li>
          <li><strong>Permissions-Policy:</strong> Comprehensive restrictions</li>
          <li><strong>Strict-Transport-Security:</strong> max-age=63072000; includeSubDomains; preload</li>
        </ul>
        <p><strong>reCAPTCHA Support:</strong> This configuration includes specific exceptions for Google reCAPTCHA services in the CSP headers, including domains like google.com, gstatic.com, and recaptcha.google.com.</p>
      </div>
      <p>Use this page to verify security headers with tools like:</p>
      <ul>
        <li><a href="https://observatory.mozilla.org/">Mozilla Observatory</a></li>
        <li><a href="https://securityheaders.com/">SecurityHeaders.io</a></li>
      </ul>
    </body>
    </html>
  `);
});

// API route for testing JSON responses
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API test endpoint with production security headers',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ========================================
  Production Security Test Server Running
  ----------------------------------------
  URL: http://0.0.0.0:${PORT}
  Mode: Production (A+ Security Headers)
  
  This server verifies security headers in
  production mode for A+ rating compliance
  
  Check for correct headers at:
  1. Root route: http://0.0.0.0:${PORT}/
  2. API route: http://0.0.0.0:${PORT}/api/test
  ========================================
  `);
});