import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerDepositRoutes } from "./deposit.routes";
import { registerUsdtRoutes } from "./usdt.routes";
import { registerChatRoutes } from "./chat.routes";
import { registerMarketRoutes } from "./market.routes";
import { registerContactRoutes } from "./contact.routes";
import authRoutes from "./auth.routes";
import emailVerificationRoutes from "./email-verification.routes";
import { passwordResetRouter } from "./password-reset.routes";
import twoFactorRoutes from "./2fa.routes";
import testRoutes from "./test.routes";
import adminTwoFactorRouter from "./admin-2fa.routes";
import { adminUserRouter } from "./admin-user.routes";
import { profileUpdatesRouter } from "./profile-updates";
import { adminClientRouter } from "./admin-client.routes";

import { adminBackupRouter } from './admin-backup.routes';
import { adminEmployeeRouter } from './admin-employee.routes';
import { employeeDashboardRouter } from './employee-dashboard.routes';
import { employeeClientRouter } from './employee-client.routes';
import { adminSecurityRouter } from './admin-security.routes';
import { configureTlsSessionResumption } from '../middleware/security';
import { bannedIpMiddleware } from '../middleware/abuse-detection';
import { registerAppConfigRoutes } from './app-config.routes';
import { registerUserDevicesRoutes } from './user-devices.routes';

export function registerRoutes(app: Express): Server {
  console.log('Starting route registration...');

  try {
    // Auth is already set up in server/index.ts - no need to call it again here
    console.log('Registering routes...');

    const httpServer = createServer(app);
    
    // Enable TLS session resumption if possible
    // Note: This only has an effect on HTTPS servers, but we include it here for completeness
    // When deployed behind a proxy like Cloudflare, they will handle TLS sessions
    configureTlsSessionResumption(httpServer);
    
    console.log('[Server] HTTP server created with security configurations');

    // Add CORS headers for all /api routes
    app.use('/api', (req, res, next) => {
      console.log('[CORS] Processing request:', {
        method: req.method,
        path: req.path,
        origin: req.headers.origin
      });

      const origin = req.headers.origin;
      if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      }
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // Register auth routes
    console.log('[Server] Registering auth routes...');
    app.use(authRoutes);
    console.log('[Server] Auth routes registered successfully');
    
    // Register email verification routes
    console.log('[Server] Registering email verification routes...');
    app.use(emailVerificationRoutes);
    console.log('[Server] Email verification routes registered successfully');
    
    // Register password reset routes with detailed logging
    console.log('[Server] Registering password reset routes...');
    console.log('[Server] passwordResetRouter routes:', 
                Object.keys(passwordResetRouter).map(key => ({key, value: (passwordResetRouter as any)[key]})));
    app.use('/api/password-reset', passwordResetRouter);
    console.log('[Server] Password reset routes registered successfully');
    
    // Register 2FA routes with special handling for content type
    console.log('[Server] Registering 2FA routes...');
    
    // Set strict path prefix for 2FA routes with middleware to ensure JSON responses
    app.use('/api/2fa', (req, res, next) => {
      // Force content type for 2FA API routes
      res.setHeader('Content-Type', 'application/json');
      
      // Log the request for debugging purposes
      console.log('[2FA API Request]', {
        method: req.method,
        path: req.path,
        fullPath: req.originalUrl,
        headers: {
          'content-type': req.headers['content-type'],
          'accept': req.headers.accept,
          'x-requested-with': req.headers['x-requested-with'],
          'x-api-request': req.headers['x-api-request']
        }
      });
      
      // Override res.send to prevent HTML responses
      const originalSend = res.send;
      res.send = function(body) {
        if (typeof body === 'string' && body.includes('<!DOCTYPE html>')) {
          console.error('[2FA API] Preventing HTML response, converting to JSON');
          return res.status(500).json({
            success: false,
            error: "Server error",
            message: "An unexpected error occurred. Please try again."
          });
        }
        return originalSend.call(this, body);
      };
      
      next();
    }, twoFactorRoutes);
    
    console.log('[Server] 2FA routes registered successfully with path prefix');
    
    // Register Admin 2FA management routes
    console.log('[Server] Registering Admin 2FA management routes...');
    app.use('/api/admin/2fa', adminTwoFactorRouter);
    console.log('[Server] Admin 2FA management routes registered successfully');
    
    // Register Admin User management routes
    console.log('[Server] Registering Admin User management routes...');
    app.use('/api/admin', adminUserRouter);
    console.log('[Server] Admin User management routes registered successfully');
    
    // Register Admin Client routes
    console.log('[Server] Registering Admin Client routes...');
    app.use('/api/admin/clients', adminClientRouter);
    console.log('[Server] Admin Client routes registered successfully');
    
    // Register Admin Backup routes
    console.log('[Server] Registering Admin Backup routes...');
    app.use('/api/admin/backup', adminBackupRouter);
    console.log('[Server] Admin Backup routes registered successfully');
    
    // Register Admin Employee routes
    console.log('[Server] Registering Admin Employee routes...');
    app.use('/api/admin/employees', adminEmployeeRouter);
    console.log('[Server] Admin Employee routes registered successfully');
    
    // Register Admin Security routes
    console.log('[Server] Registering Admin Security routes...');
    app.use('/api/admin/security', adminSecurityRouter);
    console.log('[Server] Admin Security routes registered successfully');

    // Apply banned IP middleware to all routes
    app.use(bannedIpMiddleware);
    
    // Register Employee Dashboard routes
    console.log('[Server] Registering Employee Dashboard routes...');
    app.use('/api/employee/dashboard', employeeDashboardRouter);
    console.log('[Server] Employee Dashboard routes registered successfully');
    
    // Register Employee Client routes
    console.log('[Server] Registering Employee Client routes...');
    app.use('/api/employee/clients', employeeClientRouter);
    console.log('[Server] Employee Client routes registered successfully');
    
    // Register Profile Update routes with special handling for content type
    console.log('[Server] Registering Profile Update routes...');
    
    // Set middleware to ensure JSON responses for profile updates API
    app.use('/api/profile-updates', (req, res, next) => {
      // Force content type for profile updates API routes
      res.setHeader('Content-Type', 'application/json');
      
      // Log the request for debugging purposes
      console.log('[Profile Updates API Request]', {
        method: req.method,
        path: req.path,
        fullPath: req.originalUrl,
        headers: {
          'content-type': req.headers['content-type'],
          'accept': req.headers.accept
        }
      });
      
      // Override res.send to prevent HTML responses
      const originalSend = res.send;
      res.send = function(body) {
        if (typeof body === 'string' && body.includes('<!DOCTYPE html>')) {
          console.error('[Profile Updates API] Preventing HTML response, converting to JSON');
          return res.status(500).json({
            success: false,
            error: "Server error",
            message: "An unexpected error occurred. Please try again."
          });
        }
        return originalSend.call(this, body);
      };
      
      next();
    }, profileUpdatesRouter);
    
    console.log('[Server] Profile Update routes registered successfully with JSON content type');
    
    // Register test routes for debugging 2FA functionality
    console.log('[Server] Registering 2FA test routes...');
    app.use(testRoutes);
    console.log('[Server] 2FA test routes registered successfully');

    // Register all route modules with error handling
    console.log('[Server] Registering route modules...');
    const routeModules = [
      { name: 'Deposit', register: registerDepositRoutes },
      { name: 'USDT', register: registerUsdtRoutes },
      { name: 'Chat', register: registerChatRoutes },
      { name: 'Market', register: registerMarketRoutes },
      { name: 'Contact', register: registerContactRoutes },
      { name: 'App Config', register: registerAppConfigRoutes },
      { name: 'User Devices', register: registerUserDevicesRoutes }
    ];

    for (const module of routeModules) {
      try {
        console.log(`[Server] Registering ${module.name} routes...`);
        module.register(app);
        console.log(`[Server] ${module.name} routes registered successfully`);
      } catch (error) {
        console.error(`[Server] Error registering ${module.name} routes:`, error);
        throw error;
      }
    }

    // Add a catch-all error handler for unhandled errors
    app.use((err: Error, req: any, res: any, next: any) => {
      console.error('[Server] Unhandled error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
      });
      res.status(500).json({ 
        error: 'Internal server error',
        path: req.path,
        timestamp: new Date().toISOString()
      });
    });

    // Add a catch-all for API routes first
    app.all('/api/*', (req, res) => {
      console.log(`[Server] Catching undefined API route: ${req.path}`);
      res.status(404).json({
        message: 'API endpoint not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });
    
    // Add a catch-all route handler for non-API undefined routes
    app.use('*', (req, res) => {
      console.log(`[Server] Catching undefined route: ${req.originalUrl}`);
      res.status(404).json({
        error: 'Not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    });

    console.log('[Server] All routes registered successfully');
    return httpServer;
  } catch (error) {
    console.error('[Server] Fatal error during route registration:', error);
    throw error;
  }
}