
import { Request, Response, NextFunction } from "express";

// Enhanced request interface - use a simpler approach
export interface AuthenticatedRequest extends Request {
  user?: any; // Use any to avoid type conflicts with Express.User
}

// Middleware that requires authentication
export const requireAuthentication = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Minimal logging for performance
  if (!req.isAuthenticated() || !req.user) {
    console.log('Auth failed - not authenticated');
  }
  
  if (!req.isAuthenticated() || !req.user) {
    console.error("Authentication required but user is not authenticated");
    
    // Set anti-cache headers to prevent browser caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // Set CORS headers to ensure browser requests work properly
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return res.status(401).json({ 
      message: "Not authenticated", 
      error: "Authentication required",
      details: "Your session may have expired. Please login again and try again."
    });
  }
  next();
};

// Middleware that requires admin access
export const requireAdminAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Minimal logging for performance
  
  // First authenticate the request
  if (!req.isAuthenticated() || !req.user) {
    console.error("Admin authentication required but user is not authenticated");
    
    // Set anti-cache headers to prevent browser caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // Set CORS headers to ensure browser requests work properly
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return res.status(401).json({ 
      message: "Not authenticated", 
      error: "Authentication required",
      details: "Your session may have expired. Please login again and try again."
    });
  }
  
  // Check if the user is an admin
  if (!req.user?.isAdmin) {
    console.error(`Admin access required but user ${req.user.id} is not an admin`);
    return res.status(403).json({ 
      message: "Admin access required", 
      error: "Permission denied",
      details: "You do not have the necessary permissions to access this resource"
    });
  }

  // If they are an admin, proceed
  next();
};

// Middleware that requires employee access
export const requireEmployeeAccess = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Minimal logging for performance
  
  // First authenticate the request
  if (!req.isAuthenticated() || !req.user) {
    console.error("Employee authentication required but user is not authenticated");
    
    // Set anti-cache headers to prevent browser caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    // Set CORS headers to ensure browser requests work properly
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return res.status(401).json({ 
      message: "Not authenticated", 
      error: "Authentication required",
      details: "Your session may have expired. Please login again and try again."
    });
  }
  
  // Check if the user is an employee or admin
  if (!req.user?.isEmployee && !req.user?.isAdmin) {
    console.error(`Employee access required but user ${req.user.id} is neither an employee nor an admin`);
    return res.status(403).json({ 
      message: "Employee access required", 
      error: "Permission denied",
      details: "You do not have the necessary permissions to access this resource"
    });
  }

  // If they have appropriate access, proceed
  next();
};

// Utility to check if the authenticated user has the specified role
export const hasRole = (req: Request, role: string): boolean => {
  if (!req.isAuthenticated() || !req.user) {
    return false;
  }
  
  if (role === 'admin' && req.user.isAdmin) {
    return true;
  }
  
  if (role === 'employee' && (req.user.isEmployee || req.user.isAdmin)) {
    return true;
  }
  
  return req.user.userGroup === role;
};
