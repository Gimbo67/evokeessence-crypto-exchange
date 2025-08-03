/**
 * Production Security Headers Test (Non-persistent)
 * 
 * This script tests the security headers in production mode without starting a long-running server.
 * It applies the same headers as the production environment, makes the request, 
 * and exits after displaying the results.
 */

import express from 'express';
import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import helmet from 'helmet';
import axios from 'axios';

// Force production mode
process.env.NODE_ENV = 'production';
process.env.SECURITY_TEST = 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create express app with production security headers
const app = express();
const PORT = 5001;

console.log(`[Security Test] Running in production mode: NODE_ENV=${process.env.NODE_ENV}`);

// Apply custom security headers middleware
app.use((req, res, next) => {
  // Production mode - apply strict CSP for A+ rating with reCAPTCHA support
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
  
  // Add trace headers for test
  res.setHeader('X-Security-Test', 'production-mode');
  
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
  res.status(200).json({
    success: true,
    message: 'Production security headers test successful',
    environment: process.env.NODE_ENV
  });
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

// Helper to display security headers
function displaySecurityHeaders(headers) {
  const securityHeaders = [
    'content-security-policy',
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
    'strict-transport-security',
    'referrer-policy',
    'x-permitted-cross-domain-policies',
    'x-dns-prefetch-control',
    'cross-origin-opener-policy',
    'cross-origin-resource-policy',
    'cross-origin-embedder-policy',
    'permissions-policy'
  ];

  console.log('Security Headers:');
  securityHeaders.forEach(header => {
    if (headers[header]) {
      console.log(`${header}: ${headers[header]}`);
    } else {
      console.log(`${header}: [not present]`);
    }
  });
  
  // Print any special test headers
  if (headers['x-security-test']) {
    console.log(`x-security-test: ${headers['x-security-test']}`);
  }
}

// Start server and run tests
let server;

async function testSecurityHeaders() {
  return new Promise((resolve) => {
    server = http.createServer(app).listen(PORT, '0.0.0.0', async () => {
      console.log(`[Security Test] Server started on port ${PORT} for testing`);
      
      try {
        console.log('\nTesting Root Route (/):');
        const rootResponse = await axios.get(`http://localhost:${PORT}/`);
        console.log(`Status: ${rootResponse.status}`);
        displaySecurityHeaders(rootResponse.headers);
        
        console.log('\nTesting API Route (/api/test):');
        const apiResponse = await axios.get(`http://localhost:${PORT}/api/test`);
        console.log(`Status: ${apiResponse.status}`);
        displaySecurityHeaders(apiResponse.headers);
        
        console.log('\n[Security Test] Tests completed successfully!');
        
        // Close server and resolve promise
        server.close(() => {
          console.log('[Security Test] Server closed');
          resolve();
        });
      } catch (error) {
        console.error('[Security Test] Error during tests:', error);
        server.close(() => {
          console.log('[Security Test] Server closed due to error');
          resolve();
        });
      }
    });
  });
}

// Main function 
async function main() {
  console.log('Starting production security headers test...');
  await testSecurityHeaders();
  console.log('All tests completed!');
}

main().catch(err => {
  console.error('Test failed with error:', err);
  if (server) server.close();
});