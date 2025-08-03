import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure Content-Type headers are properly set for JSON responses
 * This helps maintain compatibility with Cloudflare API Schema Validation
 */
export const enforceJsonContentType = (req: Request, res: Response, next: NextFunction) => {
  // Store the original json method
  const originalJson = res.json;
  
  // Override the json method to ensure proper Content-Type header
  res.json = function(body?: any): Response {
    // Set the Content-Type header explicitly
    res.setHeader('Content-Type', 'application/json');
    
    // Call the original json method
    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Enforces structure consistency based on the OpenAPI schema
 * This wraps API responses to ensure they match the expected schema format
 */
export const enforceSchemaConsistency = (req: Request, res: Response, next: NextFunction) => {
  // Store original send method
  const originalSend = res.send;
  
  // Override send to enforce consistent structure
  res.send = function(body?: any): Response {
    // Fix for API routes returning HTML instead of JSON
    if (req.path.startsWith('/api/') && typeof body === 'string' && body.includes('<!DOCTYPE html>')) {
      console.error(`[API Error] Intercepted HTML response on API route: ${req.path}`);
      res.setHeader('Content-Type', 'application/json');
      return originalSend.call(this, JSON.stringify({
        success: false,
        error: "Server error",
        message: "An unexpected error occurred while processing API request."
      }));
    }
    
    if (body && typeof body === 'object') {
      // If response is already properly structured, pass through
      if (body.hasOwnProperty('data') || 
          body.hasOwnProperty('error') || 
          body.hasOwnProperty('message') ||
          body.hasOwnProperty('status') ||
          body.hasOwnProperty('success')) {
        return originalSend.call(this, body);
      }
      
      // If it's an array, wrap it in a data property
      if (Array.isArray(body)) {
        return originalSend.call(this, { data: body });
      }
      
      // For basic objects, ensure they have a consistent structure
      if (!res.statusCode || res.statusCode < 400) {
        // Success responses
        return originalSend.call(this, { 
          status: 'success',
          data: body 
        });
      } else {
        // Error responses
        return originalSend.call(this, { 
          status: 'error',
          message: body.message || 'An error occurred',
          details: body.details || undefined
        });
      }
    }
    
    // For non-object responses, pass through unchanged
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * Log response data for debugging and monitoring schema compliance
 * This is useful during development to identify inconsistencies
 */
export const logResponseSchema = (req: Request, res: Response, next: NextFunction) => {
  // Store original send method
  const originalSend = res.send;
  
  // Override send to log the response
  res.send = function(body?: any): Response {
    if (process.env.NODE_ENV !== 'production' && 
        body && 
        typeof body === 'object' &&
        !req.path.includes('/_next') && 
        !req.path.includes('/__vite') &&
        !req.path.includes('/node_modules') &&
        req.path.startsWith('/api')) {
      console.log(`[Schema Validation] Response for ${req.method} ${req.path}:`, 
        typeof body === 'object' ? 'Valid JSON structure' : 'Non-JSON response');
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};