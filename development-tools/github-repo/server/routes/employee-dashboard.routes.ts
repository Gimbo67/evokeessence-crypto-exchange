import express, { Request, Response, NextFunction } from "express";
import { requireAuthentication } from "../middleware/auth";
import { requireEmployeeAccess } from "../middleware/admin";
import { 
  getDashboardStats, 
  getDashboardData, 
  getEmployeePermissions 
} from "../controllers/employee-dashboard.controller";

export const employeeDashboardRouter = express.Router();

// Log all requests to employee dashboard routes for debugging
employeeDashboardRouter.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[EMPLOYEE DASHBOARD] ${req.method} ${req.originalUrl} - Auth:`, 
              req.isAuthenticated ? req.isAuthenticated() : false,
              "User ID:", req.user?.id);
  next();
});

// Middleware to ensure all routes require authentication and employee access
employeeDashboardRouter.use(requireAuthentication);
employeeDashboardRouter.use(requireEmployeeAccess);

// Force JSON responses for all employee dashboard routes
employeeDashboardRouter.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Type', 'application/json');
  
  // Capture the original res.json method to add logging
  const originalJson = res.json;
  res.json = function(data) {
    console.log(`[EMPLOYEE DASHBOARD] Response ${req.originalUrl} - Status: ${res.statusCode}, Data keys:`, 
                Object.keys(data || {}));
    return originalJson.call(this, data);
  };
  
  // Capture the original res.status method to track errors
  const originalStatus = res.status;
  res.status = function(code) {
    console.log(`[EMPLOYEE DASHBOARD] Setting status code for ${req.originalUrl} - Status: ${code}`);
    return originalStatus.call(this, code);
  };
  
  next();
});

/**
 * @route GET /api/employee/dashboard/stats
 * @desc Get dashboard statistics for employee access
 * @access Employee only
 */
employeeDashboardRouter.get("/stats", async (req: Request, res: Response) => {
  console.log("[EMPLOYEE DASHBOARD] Fetching dashboard stats for user:", req.user?.id);
  try {
    return getDashboardStats(req, res);
  } catch (error) {
    console.error("[EMPLOYEE DASHBOARD] Error in /stats endpoint:", error);
    return res.status(500).json({ error: "Internal server error in stats endpoint" });
  }
});

/**
 * @route GET /api/employee/dashboard
 * @desc Get dashboard data including recent transactions and notifications
 * @access Employee only
 */
employeeDashboardRouter.get("/", async (req: Request, res: Response) => {
  console.log("[EMPLOYEE DASHBOARD] Fetching dashboard data for user:", req.user?.id);
  try {
    return getDashboardData(req, res);
  } catch (error) {
    console.error("[EMPLOYEE DASHBOARD] Error in root endpoint:", error);
    return res.status(500).json({ error: "Internal server error in dashboard endpoint" });
  }
});

/**
 * @route GET /api/employee/dashboard/permissions
 * @desc Get all permissions for the logged-in employee
 * @access Employee only
 */
employeeDashboardRouter.get("/permissions", async (req: Request, res: Response) => {
  console.log("[EMPLOYEE DASHBOARD] Fetching permissions for user:", req.user?.id);
  try {
    return getEmployeePermissions(req, res);
  } catch (error) {
    console.error("[EMPLOYEE DASHBOARD] Error in /permissions endpoint:", error);
    return res.status(500).json({ error: "Internal server error in permissions endpoint" });
  }
});