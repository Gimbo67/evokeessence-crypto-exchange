import { type Request, type Response, type NextFunction } from "express";
import { UserGroup } from "../types/user-groups";

// Middleware for checking if user is any type of employee
export function requireEmployee(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    console.log('Authentication failed - user not logged in');
    return res.status(401).json({ message: "Not authenticated" });
  }

  const employeeGroups = [
    UserGroup.KYC_EMPLOYEE,
    UserGroup.FINANCE_EMPLOYEE,
    UserGroup.VIEWONLY_EMPLOYEE,
    UserGroup.SECOND_ADMIN
  ];

  // Support both snake_case and camelCase field names
  const userIsAdmin = req.user?.isAdmin || req.user?.is_admin || false;
  const userIsEmployee = req.user?.isEmployee || req.user?.is_employee || false;
  const userGroup = req.user?.userGroup || req.user?.user_group || '';

  if (userIsAdmin || userIsEmployee || (userGroup && employeeGroups.includes(userGroup as UserGroup))) {
    console.log('Employee access granted for user:', {
      userId: req.user?.id,
      username: req.user?.username,
      isAdmin: userIsAdmin,
      isEmployee: userIsEmployee,
      userGroup: userGroup
    });
    next();
  } else {
    console.log('Authorization failed - user lacks employee access:', {
      userId: req.user?.id,
      username: req.user?.username,
      isAdmin: userIsAdmin,
      isEmployee: userIsEmployee,
      userGroup: userGroup,
      originalUserObj: {
        isAdmin: req.user?.isAdmin,
        is_admin: req.user?.is_admin,
        isEmployee: req.user?.isEmployee,
        is_employee: req.user?.is_employee,
        userGroup: req.user?.userGroup,
        user_group: req.user?.user_group
      }
    });
    return res.status(403).json({ message: "Access denied - Employee privileges required" });
  }
}

// KYC employee middleware
export function requireKycEmployee(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    console.log('Authentication failed - user not logged in');
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Support both snake_case and camelCase field names
  const userIsAdmin = req.user?.isAdmin || req.user?.is_admin || false;
  const userGroup = req.user?.userGroup || req.user?.user_group || '';

  if (userIsAdmin || userGroup === UserGroup.SECOND_ADMIN || userGroup === UserGroup.KYC_EMPLOYEE) {
    console.log('KYC employee access granted for user:', {
      userId: req.user?.id,
      username: req.user?.username,
      isAdmin: userIsAdmin,
      userGroup: userGroup
    });
    next();
  } else {
    console.log('Authorization failed - user lacks KYC employee access:', {
      userId: req.user?.id,
      username: req.user?.username,
      isAdmin: userIsAdmin,
      userGroup: userGroup,
      originalUserObj: {
        isAdmin: req.user?.isAdmin,
        is_admin: req.user?.is_admin,
        userGroup: req.user?.userGroup,
        user_group: req.user?.user_group
      }
    });
    return res.status(403).json({ message: "Access denied - KYC privileges required" });
  }
}

// Finance employee middleware
export function requireFinanceEmployee(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    console.log('Authentication failed - user not logged in');
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Support both snake_case and camelCase field names
  const userIsAdmin = req.user?.isAdmin || req.user?.is_admin || false;
  const userGroup = req.user?.userGroup || req.user?.user_group || '';

  if (userIsAdmin || userGroup === UserGroup.SECOND_ADMIN || userGroup === UserGroup.FINANCE_EMPLOYEE) {
    console.log('Finance employee access granted for user:', {
      userId: req.user?.id,
      username: req.user?.username,
      isAdmin: userIsAdmin,
      userGroup: userGroup
    });
    next();
  } else {
    console.log('Authorization failed - user lacks finance employee access:', {
      userId: req.user?.id,
      username: req.user?.username,
      isAdmin: userIsAdmin,
      userGroup: userGroup,
      originalUserObj: {
        isAdmin: req.user?.isAdmin,
        is_admin: req.user?.is_admin,
        userGroup: req.user?.userGroup,
        user_group: req.user?.user_group
      }
    });
    return res.status(403).json({ message: "Access denied - Finance privileges required" });
  }
}

// Second rank admin middleware
export function requireSecondRankAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    console.log('Authentication failed - user not logged in');
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Support both snake_case and camelCase field names
  const userIsAdmin = req.user?.isAdmin || req.user?.is_admin || false;
  const userGroup = req.user?.userGroup || req.user?.user_group || '';

  console.log('Checking admin access for user:', {
    userId: req.user?.id,
    username: req.user?.username,
    isAdmin: userIsAdmin,
    userGroup: userGroup
  });

  if (userIsAdmin || userGroup === UserGroup.SECOND_ADMIN) {
    console.log('Admin access granted for user:', {
      userId: req.user?.id,
      username: req.user?.username,
      isAdmin: userIsAdmin,
      userGroup: userGroup
    });
    next();
  } else {
    console.log('Admin access denied for user:', {
      userId: req.user?.id,
      username: req.user?.username,
      isAdmin: userIsAdmin,
      userGroup: userGroup,
      originalUserObj: {
        isAdmin: req.user?.isAdmin,
        is_admin: req.user?.is_admin,
        userGroup: req.user?.userGroup,
        user_group: req.user?.user_group
      }
    });
    return res.status(403).json({ message: "Access denied - Admin privileges required" });
  }
}