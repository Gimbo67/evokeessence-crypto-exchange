import { Request, Response, NextFunction } from "express";
import { UserGroup } from "../types/user-groups";

// Main admin only
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    console.log('Authentication failed - user not logged in');
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Support both snake_case and camelCase field names
  const userIsAdmin = req.user?.isAdmin || req.user?.is_admin || false;

  if (!userIsAdmin) {
    console.log('Authorization failed - user is not an admin:', {
      userId: req.user?.id,
      username: req.user?.username,
      isAdmin: userIsAdmin,
      userGroup: req.user?.userGroup || req.user?.user_group,
      originalUserObj: {
        isAdmin: req.user?.isAdmin,
        is_admin: req.user?.is_admin
      }
    });
    return res.status(403).json({ message: "Not authorized" });
  }

  console.log('Admin access granted for user:', {
    userId: req.user.id,
    username: req.user.username,
    isAdmin: userIsAdmin
  });
  next();
}

// Admin or second rank admin access
export function requireAdminAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    console.log('Authentication failed - user not logged in');
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Support both snake_case and camelCase field names
  const userIsAdmin = req.user?.isAdmin || req.user?.is_admin || false;
  const userGroup = req.user?.userGroup || req.user?.user_group || '';
  
  // Check for either admin flag or second_admin userGroup
  const hasAccess = userIsAdmin || userGroup === UserGroup.SECOND_ADMIN || userGroup === "second_admin";

  if (!hasAccess) {
    console.log('Authorization failed - user lacks admin access:', {
      userId: req.user?.id,
      username: req.user?.username,
      isAdmin: userIsAdmin,
      userGroup: userGroup,
      hasAccess,
      originalUserObj: {
        isAdmin: req.user?.isAdmin,
        is_admin: req.user?.is_admin,
        userGroup: req.user?.userGroup,
        user_group: req.user?.user_group
      }
    });
    return res.status(403).json({ message: "Not authorized" });
  }

  console.log('Admin access granted for user:', {
    userId: req.user?.id,
    username: req.user?.username,
    isAdmin: userIsAdmin,
    userGroup: userGroup,
    hasAccess
  });
  next();
}

// KYC employee access
export function requireKYCAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    console.log('Authentication failed - user not logged in');
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Support both snake_case and camelCase field names
  const userIsAdmin = req.user?.isAdmin || req.user?.is_admin || false;
  const userGroup = req.user?.userGroup || req.user?.user_group || '';

  const hasAccess = userIsAdmin || 
                    userGroup === UserGroup.SECOND_ADMIN || 
                    userGroup === UserGroup.KYC_EMPLOYEE;

  if (!hasAccess) {
    console.log('Authorization failed - user lacks KYC access:', {
      userId: req.user?.id,
      username: req.user?.username,
      isAdmin: userIsAdmin,
      userGroup: userGroup,
      hasAccess
    });
    return res.status(403).json({ message: "Not authorized" });
  }

  console.log('KYC access granted for user:', {
    userId: req.user?.id,
    username: req.user?.username,
    isAdmin: userIsAdmin,
    userGroup: userGroup,
    hasAccess
  });
  next();
}

// Finance employee access
export function requireFinanceAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    console.log('Authentication failed - user not logged in');
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Support both snake_case and camelCase field names
  const userIsAdmin = req.user?.isAdmin || req.user?.is_admin || false;
  const userGroup = req.user?.userGroup || req.user?.user_group || '';

  const hasAccess = userIsAdmin || 
                    userGroup === UserGroup.SECOND_ADMIN || 
                    userGroup === UserGroup.FINANCE_EMPLOYEE;

  if (!hasAccess) {
    console.log('Authorization failed - user lacks finance access:', {
      userId: req.user?.id,
      username: req.user?.username,
      isAdmin: userIsAdmin,
      userGroup: userGroup,
      hasAccess
    });
    return res.status(403).json({ message: "Not authorized" });
  }

  console.log('Finance access granted for user:', {
    userId: req.user?.id,
    username: req.user?.username,
    isAdmin: userIsAdmin,
    userGroup: userGroup,
    hasAccess
  });
  next();
}

// View only access - allows any employee role
export function requireEmployeeAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    console.log('Authentication failed - user not logged in');
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Support both snake_case and camelCase field names
  const userIsAdmin = req.user?.isAdmin || req.user?.is_admin || false;
  const userGroup = req.user?.userGroup || req.user?.user_group || '';

  const hasAccess = userIsAdmin || 
                    userGroup === UserGroup.SECOND_ADMIN || 
                    userGroup === UserGroup.KYC_EMPLOYEE || 
                    userGroup === UserGroup.FINANCE_EMPLOYEE || 
                    userGroup === UserGroup.VIEWONLY_EMPLOYEE;

  if (!hasAccess) {
    console.log('Authorization failed - user lacks employee access:', {
      userId: req.user?.id,
      username: req.user?.username,
      isAdmin: userIsAdmin,
      userGroup: userGroup,
      hasAccess
    });
    return res.status(403).json({ message: "Not authorized" });
  }

  console.log('Employee access granted for user:', {
    userId: req.user?.id,
    username: req.user?.username,
    isAdmin: userIsAdmin,
    userGroup: userGroup,
    hasAccess
  });
  next();
}