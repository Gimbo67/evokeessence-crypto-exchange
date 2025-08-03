# Security Implementation Documentation

## Overview
This document outlines the security implementation for the Evo-Exchange platform. The security infrastructure is designed to achieve an A+ rating on Mozilla Observatory and SecurityHeaders.io scans while maintaining full functionality in both development and production environments.

## Key Components

### Security Headers
The platform implements the following security headers:
- **Content-Security-Policy (CSP)**: Prevents XSS attacks by restricting script sources
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Prevents clickjacking attacks
- **Referrer-Policy**: Controls information sent in the Referer header
- **Permissions-Policy**: Restricts powerful features to specific origins
- **Strict-Transport-Security**: Forces HTTPS connections

### Environment-Specific Configurations
- **Development Mode**: Modified CSP headers include `'unsafe-eval'` and `'unsafe-inline'` to allow Vite HMR functionality, while also including necessary domains for third-party services
- **Production Mode**: Strict CSP headers with carefully selected exceptions for required services like Google reCAPTCHA, providing balance between security and functionality

### Google reCAPTCHA Integration
To ensure functionality with Google reCAPTCHA while maintaining high security ratings, the CSP headers include specific allowances for:
- **script-src**: google.com, gstatic.com, recaptcha.google.com, googletagmanager.com
- **style-src**: gstatic.com with 'unsafe-inline' for required inline styles
- **frame-src**: google.com, recaptcha.google.com, recaptcha.net for embedding the CAPTCHA widget
- **connect-src**: google.com, googleapis.com, recaptcha.net for API calls
- **worker-src**: gstatic.com for web workers

### Security Middleware
The security implementation uses a custom middleware approach to ensure headers are correctly applied to all routes, including static content:
1. High-priority middleware intercepts response headers
2. Environment detection for appropriate CSP configuration
3. Header order preservation to prevent override issues

## Testing Tools

### Development Testing
Run the standard development server:
```
npm run dev
```

### Production Security Testing
To verify production security headers:
```
./run-production-security-test.sh
```
This starts a dedicated test server that applies production-grade security headers for verification with security scanning tools.

### Testing External Services Compatibility
The production test server includes specific configurations to maintain compatibility with Google reCAPTCHA and other third-party services. To verify that security headers allow these services to function while maintaining A+ security ratings:
```
./security-test-curl.sh
```
This script tests the security headers in both development and production environments and verifies that the necessary CSP exceptions are properly configured.

## Security Features

### Abuse Detection
- Tracks login attempts with progressive security measures
- CAPTCHA requirement after 3 failed login attempts
- IP ban after 5 failed login attempts
- Progressive ban durations (1 hour → 24 hours → permanent)

### Administrative Controls
- Security dashboard for administrators
- IP ban/unban functionality
- Security logs and event tracking
- Visualized security metrics

### Authentication
- reCAPTCHA token validation on login
- Two-factor authentication support
- Session management with secure cookies
- Role-based access controls

## Production Deployment Considerations
- CSP header nonces generation for inline scripts
- HTTP to HTTPS redirection
- Subresource Integrity for CDN resources
- Regular security header audit

## Third-Party Services Compatibility

### Google reCAPTCHA
The security implementation ensures full compatibility with Google reCAPTCHA while maintaining an A+ security rating. Key considerations:

1. **Required Domains**: All necessary Google domains are explicitly allowed in CSP directives
2. **Modified Cross-Origin Policies**: Cross-Origin-Embedder-Policy and Cross-Origin-Resource-Policy are configured to allow reCAPTCHA frames
3. **Balance**: The CSP policy is structured to be as restrictive as possible while ensuring reCAPTCHA functions correctly

### External APIs
For any additional third-party APIs or services, the CSP headers will need similar exceptions. The process for adding new third-party services:

1. Identify all domains required for the service to function
2. Determine which CSP directives need to include these domains
3. Update the security middleware with minimal necessary exceptions
4. Test thoroughly to ensure the service works while maintaining security ratings