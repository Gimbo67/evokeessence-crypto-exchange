/**
 * CSP Test Script
 * 
 * This script tests the CSP headers in a production-like environment to verify
 * that Google reCAPTCHA domains are properly allowed.
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 8000;

// Apply CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Apply security headers for production mode
app.use((req, res, next) => {
  // Apply production-grade CSP with Google reCAPTCHA domains
  const cspProd = "default-src 'self'; script-src 'self' https://www.google.com https://www.gstatic.com https://recaptcha.google.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://www.gstatic.com; img-src 'self' data: blob: https://www.google.com https://www.gstatic.com; font-src 'self' data:; connect-src 'self' wss: ws: https://www.google.com https://www.googleapis.com https://recaptcha.net; object-src 'none'; frame-src https://www.google.com https://recaptcha.google.com https://www.recaptcha.net; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self'; worker-src 'self' blob: https://www.gstatic.com; upgrade-insecure-requests;";
  
  res.setHeader('Content-Security-Policy', cspProd);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', "accelerometer=(), camera=(), gyroscope=(), magnetometer=(), microphone=(), usb=(), interest-cohort=()");
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  
  next();
});

// Create a simple test page with Google reCAPTCHA
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>reCAPTCHA CSP Test</title>
      <script src="https://www.google.com/recaptcha/api.js" async defer></script>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #333; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 4px; }
        .test-result { padding: 10px; margin: 20px 0; border-radius: 4px; }
        .success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; }
        .error { background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Google reCAPTCHA CSP Test</h1>
        <p>This page tests if the Content Security Policy headers allow Google reCAPTCHA to load properly.</p>
        
        <div id="test-results">
          <div id="recaptcha-load-test" class="test-result">Loading reCAPTCHA...</div>
        </div>
        
        <form action="?" method="POST">
          <div class="g-recaptcha" data-sitekey="${process.env.RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}"></div>
          <br/>
          <input type="submit" value="Submit" id="submit-button">
        </form>
        
        <h2>Current CSP Headers</h2>
        <pre>${cspProd}</pre>
        
        <script>
          // Test if reCAPTCHA loads successfully
          window.onload = function() {
            // Check if grecaptcha object exists after a delay
            setTimeout(function() {
              const recaptchaTest = document.getElementById('recaptcha-load-test');
              
              if (window.grecaptcha && typeof grecaptcha.render === 'function') {
                recaptchaTest.textContent = 'SUCCESS: reCAPTCHA loaded successfully!';
                recaptchaTest.className = 'test-result success';
              } else {
                recaptchaTest.textContent = 'ERROR: reCAPTCHA failed to load. Check CSP headers.';
                recaptchaTest.className = 'test-result error';
                
                console.error('reCAPTCHA failed to load. Check browser console for CSP violation errors.');
              }
            }, 2000);
          };
        </script>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CSP Test server running at http://0.0.0.0:${PORT}`);
  console.log(`Test if Google reCAPTCHA loads with production CSP headers`);
});