import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check if user is authenticated 
 * This is used to protect API routes that require authentication
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Check if the user is authenticated (set by Passport.js)
  if (req.isAuthenticated()) {
    return next();
  }
  
  // If not authenticated, return 401 Unauthorized
  return res.status(401).json({
    success: false,
    message: 'Authentication required',
    code: 'AUTH_REQUIRED'
  });
};

/**
 * Middleware to check if user is an admin
 * This is used to protect admin-only routes
 */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  // First check if user is authenticated
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  // Then check if user is an admin
  const user = req.user as any;
  if (user && user.is_admin) {
    return next();
  }
  
  // If not an admin, return 403 Forbidden
  return res.status(403).json({
    success: false,
    message: 'Admin access required',
    code: 'ADMIN_REQUIRED'
  });
};

/**
 * Middleware to check if user is an employee
 * This is used to protect employee-only routes
 */
export const isEmployee = (req: Request, res: Response, next: NextFunction) => {
  // First check if user is authenticated
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  // Then check if user is an employee
  const user = req.user as any;
  if (user && user.user_group === 'employee') {
    return next();
  }
  
  // If not an employee, return 403 Forbidden
  return res.status(403).json({
    success: false,
    message: 'Employee access required',
    code: 'EMPLOYEE_REQUIRED'
  });
};

export default {
  isAuthenticated,
  isAdmin,
  isEmployee
};