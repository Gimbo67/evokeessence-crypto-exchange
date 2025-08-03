/**
 * Standalone security test server
 * This server is used to verify security headers for A+ rating without
 * interfering with the Vite development server configuration
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 5005;

// Apply security headers exactly as required for A+ rating
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
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

// Add comprehensive Permissions-Policy header
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()');
  next();
});

// Serve a simple HTML page for testing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Security Headers Test</title>
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
        code {
          background: #eee;
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
        }
      </style>
    </head>
    <body>
      <h1>Security Headers Test Server</h1>
      <div class="info">
        <p>This is a standalone server for testing security headers configuration. It applies the exact security headers required for an A+ rating on Mozilla Observatory and SecurityHeaders.io.</p>
        <p>Current headers applied:</p>
        <ul>
          <li><strong>Content-Security-Policy:</strong> Strict configuration prohibiting unsafe scripts</li>
          <li><strong>X-Frame-Options:</strong> DENY</li>
          <li><strong>X-Content-Type-Options:</strong> nosniff</li>
          <li><strong>Referrer-Policy:</strong> no-referrer</li>
          <li><strong>Permissions-Policy:</strong> Comprehensive restrictions</li>
          <li><strong>Strict-Transport-Security:</strong> max-age=63072000; includeSubDomains; preload</li>
        </ul>
      </div>
      <p>To test, run security scans against: <code>http://localhost:${PORT}</code></p>
      <p>Note: This standalone server uses the production-grade security headers that would break Vite's development server if applied there.</p>
    </body>
    </html>
  `);
});

// Add an API endpoint for testing JSON responses
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API test endpoint with security headers',
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ========================================
  Security Test Server Running
  ----------------------------------------
  URL: http://0.0.0.0:${PORT}
  Mode: Production Security (A+ Headers)
  
  Use this server to verify security headers
  without interfering with Vite development.
  
  Run security scans against this endpoint.
  ========================================
  `);
});