import { Request, Response, NextFunction } from "express";
import { db } from "@db";
import { userPermissions } from "@db/schema";
import { eq, and } from "drizzle-orm";

export function requirePermission(permissionType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Admin always has all permissions
    if (req.user?.is_admin) {
      return next();
    }

    try {
      // Check if user has the required permission
      const permission = await db.query.userPermissions.findFirst({
        where: and(
          eq(userPermissions.user_id, req.user!.id),
          eq(userPermissions.permission_type, permissionType)
        ),
      });

      if (permission?.granted) {
        next();
      } else {
        res.status(403).json({ message: "Permission denied" });
      }
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: "Error checking permissions" });
    }
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (!req.user?.is_admin) {
    return res.status(403).json({ message: "Not authorized" });
  }

  next();
}

export function requireEmployee(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Check if user is an employee based on is_employee flag or has an employee user group
  const isEmployeeGroup = req.user?.user_group?.startsWith('emp_') || 
                         req.user?.user_group === 'kyc_employee' || 
                         req.user?.user_group === 'second_admin';

  if (!req.user?.is_employee && !isEmployeeGroup) {
    return res.status(403).json({ message: "Not authorized" });
  }

  next();
}