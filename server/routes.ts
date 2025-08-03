import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users, sepaDeposits, usdtOrders, usdcOrders, kycDocuments, chatHistory, userPermissions, verificationCodes, profileUpdateRequests, userSessions } from "@db/schema";
import { eq } from "drizzle-orm";
import express from "express";
import { requireAdminAccess } from "./middleware/admin";
import bcrypt from 'bcrypt';
import { registerDepositRoutes } from "./routes/deposit.routes";
import { registerMarketRoutes } from "./routes/market.routes";
import { registerUsdtRoutes } from "./routes/usdt.routes";
import { registerUsdcRoutes } from "./routes/usdc.routes";
import { registerContactRoutes } from "./routes/contact.routes";
import authRouter from "./routes/auth.routes";
import kycRouter from "./routes/kyc";
import { transactionsRouter } from "./routes/transactions";
import { and, not, or, ilike, sql, desc, inArray } from "drizzle-orm";
import { UserGroup } from "./types/user-groups";
import { z } from "zod";
import { getExchangeRates, convertCurrency } from "./services/exchange-rates"; // Import exchange rate services
import { registerNewsRoutes } from "./routes/news.routes";
import userRouter from "./routes/user";
import { adminEmployeeRouter } from "./routes/admin-employee.routes";
import webSocketService from "./services/websocket";
import { registerWebSocketRoutes } from "./routes/websocket.routes";
import { registerTestWebSocketRoutes } from "./routes/test-websocket.routes";
import { registerAppConfigRoutes } from "./routes/app-config.routes";
import { registerUserDevicesRoutes } from "./routes/user-devices.routes";
import { registerPushNotificationRoutes } from "./routes/push-notifications.routes";

import contractorRouter from "./routes/contractor.routes";
import telegramBotRouter from "./routes/telegram-bot.routes";
import exportRouter from "./routes/export.routes";

// Create router instance
const router = express.Router();
router.use(kycRouter);

// Types for analytics data
interface TimeData {
  timestamp: string;
  deposits: number;
  orders: number;
  amount: number;
  activeUsers: number;
}

interface PeriodStats {
  totalTransactions: number;
  totalAmount: number;
  uniqueUsers: number;
  depositCount: number;
  depositAmount: number;
  depositCommissionAmount: number;  // Added commission amount
  orderCount: number;
  orderAmount: number;
  timeline: TimeData[];
}

interface AnalyticsData {
  daily: PeriodStats;
  weekly: PeriodStats;
  monthly: PeriodStats;
  yearToDate: {
    totalTransactions: number;
    totalAmount: number;
    uniqueActiveUsers: number;
    totalClients: number;
    deposits: {
      count: number;
      amount: number;
      commissionAmount: number; // Added commission amount
    };
    orders: {
      count: number;
      amount: number;
    };
    commissionRate: number; // Added commission rate
    contractors: {
      count: number;
      referredDeposits: number;
      referredAmount: number;
      commissionAmount: number;
    };
  };
}

// Helper function to safely create Date objects
const safeDate = (date: Date | string | null): Date => {
  if (date instanceof Date) return date;
  if (typeof date === 'string') return new Date(date);
  return new Date();
};

// Helper function for safe date comparison
const compareDates = (a: Date | null, b: Date | null): number => {
  const dateA = safeDate(a);
  const dateB = safeDate(b);
  return dateB.getTime() - dateA.getTime();
};

// Helper function to check if user has employee-level access
const hasEmployeeAccess = (user: any) => {
  return user?.isAdmin ||
    user?.isEmployee ||
    user?.userGroup === UserGroup.SECOND_ADMIN ||
    user?.userGroup === UserGroup.FINANCE_EMPLOYEE ||
    user?.userGroup === UserGroup.KYC_EMPLOYEE ||
    user?.userGroup === UserGroup.VIEWONLY_EMPLOYEE;
};

// Add employee middleware
const requireEmployeeAccess = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (!hasEmployeeAccess(req.user)) {
    return res.status(403).json({ message: "Access denied" });
  }

  next();
};

// Helper function to generate timeline data
const generateTimelineData = (deposits: any[], orders: any[], intervals: { start: Date; end: Date }[]): TimeData[] => {
  return intervals.map(({ start, end }) => {
    const periodDeposits = deposits.filter(d => {
      const date = safeDate(d.createdAt);
      return date >= start && date < end;
    });
    const periodOrders = orders.filter(o => {
      const date = safeDate(o.createdAt);
      return date >= start && date < end;
    });

    // Safely handle amount calculation
    const totalAmount = [...periodDeposits, ...periodOrders].reduce((sum, tx) => {
      // Check if it's a deposit or order and extract amount accordingly
      let txAmount = 0;
      if ('amount' in tx && tx.amount) {
        txAmount = parseFloat(tx.amount.toString());
      } else if ('amountUsd' in tx && tx.amountUsd) {
        txAmount = parseFloat(tx.amountUsd.toString());
      }
      return sum + txAmount;
    }, 0);

    return {
      timestamp: start.toISOString(),
      deposits: periodDeposits.length,
      orders: periodOrders.length,
      amount: totalAmount,
      activeUsers: new Set([
        ...periodDeposits.map(d => d.userId),
        ...periodOrders.map(o => o.userId)
      ]).size
    };
  });
};

// Helper function to generate hourly intervals for a day
const getHourlyIntervals = (date: Date): { start: Date; end: Date }[] => {
  const intervals: { start: Date; end: Date }[] = [];
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  for (let i = 0; i < 24; i++) {
    const start = new Date(startOfDay);
    start.setHours(i);
    const end = new Date(start);
    end.setHours(i + 1);
    intervals.push({ start, end });
  }

  return intervals;
};

// Helper function to generate daily intervals for a week
const getDailyIntervals = (startOfWeek: Date): { start: Date; end: Date }[] => {
  const intervals: { start: Date; end: Date }[] = [];

  for (let i = 0; i < 7; i++) {
    const start = new Date(startOfWeek);
    start.setDate(start.getDate() + i);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    intervals.push({ start, end });
  }

  return intervals;
};

// Helper function to generate weekly intervals for a month
const getWeeklyIntervals = (startOfMonth: Date): { start: Date; end: Date }[] => {
  const intervals: { start: Date; end: Date }[] = [];
  const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);

  let currentStart = new Date(startOfMonth);
  while (currentStart <= endOfMonth) {
    const start = new Date(currentStart);
    const end = new Date(currentStart);
    end.setDate(end.getDate() + 7);
    intervals.push({ start, end });
    currentStart.setDate(currentStart.getDate() + 7);
  }

  return intervals;
};

// Global error handler
const errorHandler = (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler caught:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    message: "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

export function registerRoutes(app: Express): Server {
  console.log('Starting route registration...');

  // Basic ping endpoint (no auth required)
  app.get("/api/ping", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });

  // Global exchange rate endpoint
  app.get("/api/exchange-rates", async (_req, res) => {
    try {
      const rates = await getExchangeRates();
      res.json({
        ...rates,
        updatedAt: rates.updatedAt.toISOString()
      });
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      res.status(500).json({
        message: "Failed to fetch exchange rates",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Global commission rate endpoint
  app.get("/api/settings/commission", (_req, res) => {
    try {
      // Updated commission rate from 16% to 10% as per requirements for the contractor referral system
      const COMMISSION_RATE = 0.10; // 10%
      const CONTRACTOR_COMMISSION_RATE = 0.0085; // 0.85%

      console.log('Returning commission rates:', {
        platform: COMMISSION_RATE,
        contractor: CONTRACTOR_COMMISSION_RATE
      });
      
      res.json({
        rate: COMMISSION_RATE,
        percentage: COMMISSION_RATE * 100,
        contractorRate: CONTRACTOR_COMMISSION_RATE,
        contractorPercentage: CONTRACTOR_COMMISSION_RATE * 100,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching commission rate:', error);
      res.status(500).json({
        message: "Failed to fetch commission rate",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Unknown error'
      });
    }
  });

  // Set up CORS headers first
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Auth is already set up in server/index.ts - no need to call it again here
  const httpServer = createServer(app);
  
  // Initialize WebSocket server with our HTTP server
  webSocketService.initialize(httpServer);
  console.log('WebSocket server initialized');

  console.log('Registering routes...');

  // Mount user router first to avoid conflicts
  app.use('/api/user', userRouter);
  app.use('/api', router);
  app.use(authRouter);
  app.use(transactionsRouter);
  // app.use('/api', depositsRouter); // Commented out to resolve route conflict
  
  // Mount admin employee routes
  app.use('/api/admin/employees', adminEmployeeRouter);
  
  // Mount contractor routes
  app.use('/api/contractor', contractorRouter);

  // Register feature routes
  try {
    console.log('[ROUTES] Registering deposit routes...');
  registerDepositRoutes(app);
  console.log('[ROUTES] Deposit routes registered successfully');
    registerMarketRoutes(app);
    registerUsdtRoutes(app);
    registerUsdcRoutes(app);
    registerNewsRoutes(app);
    registerContactRoutes(app); // Register contact form routes
    
    // Register WebSocket routes
    registerWebSocketRoutes(app);
    
    // Register Test WebSocket routes
    registerTestWebSocketRoutes(app);
    
    // Register App Configuration routes
    registerAppConfigRoutes(app);
    
    // Register User Devices/Sessions routes
    registerUserDevicesRoutes(app);
    
    // Register Push Notification routes
    registerPushNotificationRoutes(app);
    

    
    // Register Telegram bot routes
    console.log('Registering Telegram bot routes...');
    app.use('/api/telegram', telegramBotRouter);
    console.log('Telegram bot routes registered');
    
    // Register export routes
    console.log('Registering export routes...');
    app.use('/api/export', exportRouter);
    // Also register download route directly at root for easier access
    app.use('/download', exportRouter);
    console.log('Export routes registered');
    
    console.log('All routes registered successfully');
  } catch (error) {
    console.error('Error registering routes:', error);
    throw error;
  }

  // Admin analytics endpoint
  // User blocking endpoints
  app.post("/api/admin/users/:userId/block", requireAdminAccess, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { reason, notes } = req.body;
      const adminId = (req.user as any)?.id;

      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      if (!reason) {
        return res.status(400).json({ error: 'Block reason is required' });
      }

      // Check if user exists
      const userToBlock = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!userToBlock) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update user to blocked status
      await db.update(users)
        .set({
          is_blocked: true,
          blocked_by: adminId,
          blocked_at: new Date(),
          block_reason: reason,
          block_notes: notes || null
        })
        .where(eq(users.id, userId));

      res.json({
        success: true,
        message: 'User blocked successfully'
      });
    } catch (error) {
      console.error('Error blocking user:', error);
      res.status(500).json({ error: 'Failed to block user' });
    }
  });

  app.post("/api/admin/users/:userId/unblock", requireAdminAccess, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      // Update user to unblocked status
      await db.update(users)
        .set({
          is_blocked: false,
          blocked_by: null,
          blocked_at: null,
          block_reason: null,
          block_notes: null
        })
        .where(eq(users.id, userId));

      res.json({
        success: true,
        message: 'User unblocked successfully'
      });
    } catch (error) {
      console.error('Error unblocking user:', error);
      res.status(500).json({ error: 'Failed to unblock user' });
    }
  });

  app.get("/api/admin/blocked-users", requireAdminAccess, async (req, res) => {
    try {
      // Get blocked users first
      const blockedUsers = await db.select().from(users).where(eq(users.is_blocked, true));

      // Get admin info for blocked_by field
      const adminIds = [...new Set(blockedUsers.map(u => u.blocked_by).filter(Boolean))];
      const admins = adminIds.length > 0 ? await db.select({
        id: users.id,
        username: users.username,
        full_name: users.full_name
      }).from(users).where(inArray(users.id, adminIds)) : [];

      const adminMap = Object.fromEntries(admins.map(a => [a.id, a]));

      // Get transaction counts for each user
      const enrichedUsers = await Promise.all(blockedUsers.map(async (user) => {
        // Count SEPA deposits
        const sepaCount = await db.select().from(sepaDeposits).where(eq(sepaDeposits.userId, user.id));
        
        // Count USDT orders
        const usdtCount = await db.select().from(usdtOrders).where(eq(usdtOrders.userId, user.id));
        
        // Count USDC orders
        const usdcCount = await db.select().from(usdcOrders).where(eq(usdcOrders.userId, user.id));

        return {
          ...user,
          blockedByAdmin: user.blocked_by ? adminMap[user.blocked_by] : null,
          transactionCount: sepaCount.length + usdtCount.length + usdcCount.length
        };
      }));

      res.json(enrichedUsers);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      res.status(500).json({ error: 'Failed to fetch blocked users' });
    }
  });

  app.patch("/api/admin/users/:userId/block-notes", requireAdminAccess, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { notes } = req.body;
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      await db.update(users)
        .set({ block_notes: notes })
        .where(eq(users.id, userId));

      res.json({
        success: true,
        message: 'Block notes updated successfully'
      });
    } catch (error) {
      console.error('Error updating block notes:', error);
      res.status(500).json({ error: 'Failed to update block notes' });
    }
  });

  // Admin user deletion endpoint
  app.delete("/api/admin/users/:userId", requireAdminAccess, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      // Check if user exists
      const userToDelete = await db.query.users.findFirst({
        where: eq(users.id, userId)
      });

      if (!userToDelete) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Start a transaction to ensure data consistency
      await db.transaction(async (tx) => {
        // Delete related records first (if tables exist)
        try {
          await tx.delete(sepaDeposits).where(eq(sepaDeposits.userId, userId));
        } catch (e) { console.log('No sepaDeposits to delete'); }
        
        try {
          await tx.delete(usdtOrders).where(eq(usdtOrders.userId, userId));
        } catch (e) { console.log('No usdtOrders to delete'); }
        
        try {
          await tx.delete(usdcOrders).where(eq(usdcOrders.userId, userId));
        } catch (e) { console.log('No usdcOrders to delete'); }
        
        // Finally, delete the user
        await tx.delete(users).where(eq(users.id, userId));
      });

      res.json({
        success: true,
        message: 'User and all associated data deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ 
        error: 'Failed to delete user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/admin/analytics", requireAdminAccess, async (req, res) => {
    try {
      console.log('Fetching analytics data');

      const [deposits, orders, contractors] = await Promise.all([
        db.query.sepaDeposits.findMany({
          where: not(eq(sepaDeposits.status, 'failed'))
        }),
        db.query.usdtOrders.findMany({
          where: not(eq(usdtOrders.status, 'failed'))
        }),
        db.query.users.findMany({
          where: eq(users.is_contractor, true)
        })
      ]);

      // Calculate year-to-date metrics
      const depositCount = deposits.length;
      const depositAmount = deposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const orderCount = orders.length;
      const orderAmount = orders.reduce((sum, o) => sum + Number(o.amountUsd || 0), 0);

      const uniqueUsers = new Set([
        ...deposits.map(d => d.userId),
        ...orders.map(o => o.userId)
      ]).size;

      const [{ count: totalClients }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(
          not(eq(users.is_admin, true)),
          not(eq(users.is_employee, true))
        ));

      // Get time periods
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Filter transactions for different time periods
      const dailyDeposits = deposits.filter(d => safeDate(d.createdAt) >= today);
      const dailyOrders = orders.filter(o => safeDate(o.createdAt) >= today);

      const weeklyDeposits = deposits.filter(d => safeDate(d.createdAt) >= startOfWeek);
      const weeklyOrders = orders.filter(o => safeDate(o.createdAt) >= startOfWeek);

      const monthlyDeposits = deposits.filter(d => safeDate(d.createdAt) >= startOfMonth);
      const monthlyOrders = orders.filter(o => safeDate(o.createdAt) >= startOfMonth);

      // Generate timeline data
      const hourlyIntervals = getHourlyIntervals(today);
      const dailyIntervals = getDailyIntervals(startOfWeek);
      const weeklyIntervals = getWeeklyIntervals(startOfMonth);

      // Calculate daily total amount safely
      const dailyTotalAmount = [...dailyDeposits, ...dailyOrders].reduce((sum, tx) => {
        let txAmount = 0;
        if ('amount' in tx && tx.amount) {
          txAmount = parseFloat(tx.amount.toString());
        } else if ('amountUsd' in tx && tx.amountUsd) {
          txAmount = parseFloat(tx.amountUsd.toString());
        }
        return sum + txAmount;
      }, 0);

      // Calculate weekly total amount safely
      const weeklyTotalAmount = [...weeklyDeposits, ...weeklyOrders].reduce((sum, tx) => {
        let txAmount = 0;
        if ('amount' in tx && tx.amount) {
          txAmount = parseFloat(tx.amount.toString());
        } else if ('amountUsd' in tx && tx.amountUsd) {
          txAmount = parseFloat(tx.amountUsd.toString());
        }
        return sum + txAmount;
      }, 0);

      // Calculate monthly total amount safely
      const monthlyTotalAmount = [...monthlyDeposits, ...monthlyOrders].reduce((sum, tx) => {
        let txAmount = 0;
        if ('amount' in tx && tx.amount) {
          txAmount = parseFloat(tx.amount.toString());
        } else if ('amountUsd' in tx && tx.amountUsd) {
          txAmount = parseFloat(tx.amountUsd.toString());
        }
        return sum + txAmount;
      }, 0);

      // Commission rate constant for SEPA deposits (updated from 16% to 10%)
      const COMMISSION_RATE = 0.10; // 10%
      
      // Calculate commission amounts for different time periods
      const calculateCommissionAmount = (deposits: any[]) => {
        return deposits.reduce((sum, d) => {
          // If the record already has commissionFee, use it
          if (d.commissionFee) {
            return sum + Number(d.commissionFee);
          } else {
            // Otherwise calculate it based on the amount and commission rate
            // Since amount in DB is already after commission, we need to calculate back
            const amount = Number(d.amount || 0);
            // Original amount = amount / (1 - COMMISSION_RATE)
            const originalAmount = amount / (1 - COMMISSION_RATE);
            const commissionAmount = originalAmount * COMMISSION_RATE;
            return sum + commissionAmount;
          }
        }, 0);
      };
      
      // Calculate commission amounts for all time periods
      const depositCommissionAmount = calculateCommissionAmount(deposits);
      const dailyDepositCommissionAmount = calculateCommissionAmount(dailyDeposits);
      const weeklyDepositCommissionAmount = calculateCommissionAmount(weeklyDeposits);
      const monthlyDepositCommissionAmount = calculateCommissionAmount(monthlyDeposits);
      
      const analyticsData: AnalyticsData = {
        yearToDate: {
          deposits: {
            count: depositCount,
            amount: depositAmount,
            commissionAmount: depositCommissionAmount
          },
          orders: {
            count: orderCount,
            amount: orderAmount
          },
          totalTransactions: depositCount + orderCount,
          totalAmount: depositAmount + orderAmount,
          uniqueActiveUsers: uniqueUsers,
          totalClients,
          commissionRate: COMMISSION_RATE,
          contractors: {
            count: contractors.length,
            referredDeposits: deposits.filter(d => d.contractorId !== null).length,
            referredAmount: deposits.filter(d => d.contractorId !== null)
              .reduce((sum, d) => sum + Number(d.amount || 0), 0),
            commissionAmount: deposits.filter(d => d.contractorId !== null)
              .reduce((sum, d) => sum + Number(d.contractorCommission || 0), 0),
            completedReferredDeposits: deposits.filter(d => d.contractorId !== null && d.status === 'completed').length,
            completedReferredAmount: deposits.filter(d => d.contractorId !== null && d.status === 'completed')
              .reduce((sum, d) => sum + Number(d.amount || 0), 0),
            completedCommissionAmount: deposits.filter(d => d.contractorId !== null && d.status === 'completed')
              .reduce((sum, d) => sum + Number(d.contractorCommission || 0), 0)
          }
        },
        daily: {
          totalTransactions: dailyDeposits.length + dailyOrders.length,
          totalAmount: dailyTotalAmount,
          uniqueUsers: new Set([
            ...dailyDeposits.map(d => d.userId),
            ...dailyOrders.map(o => o.userId)
          ]).size,
          depositCount: dailyDeposits.length,
          depositAmount: dailyDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0),
          depositCommissionAmount: dailyDepositCommissionAmount,
          orderCount: dailyOrders.length,
          orderAmount: dailyOrders.reduce((sum, o) => sum + Number(o.amountUsd || 0), 0),
          timeline: generateTimelineData(dailyDeposits, dailyOrders, hourlyIntervals)
        },
        weekly: {
          totalTransactions: weeklyDeposits.length + weeklyOrders.length,
          totalAmount: weeklyTotalAmount,
          uniqueUsers: new Set([
            ...weeklyDeposits.map(d => d.userId),
            ...weeklyOrders.map(o => o.userId)
          ]).size,
          depositCount: weeklyDeposits.length,
          depositAmount: weeklyDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0),
          depositCommissionAmount: weeklyDepositCommissionAmount,
          orderCount: weeklyOrders.length,
          orderAmount: weeklyOrders.reduce((sum, o) => sum + Number(o.amountUsd || 0), 0),
          timeline: generateTimelineData(weeklyDeposits, weeklyOrders, dailyIntervals)
        },
        monthly: {
          totalTransactions: monthlyDeposits.length + monthlyOrders.length,
          totalAmount: monthlyTotalAmount,
          uniqueUsers: new Set([
            ...monthlyDeposits.map(d => d.userId),
            ...monthlyOrders.map(o => o.userId)
          ]).size,
          depositCount: monthlyDeposits.length,
          depositAmount: monthlyDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0),
          depositCommissionAmount: monthlyDepositCommissionAmount,
          orderCount: monthlyOrders.length,
          orderAmount: monthlyOrders.reduce((sum, o) => sum + Number(o.amountUsd || 0), 0),
          timeline: generateTimelineData(monthlyDeposits, monthlyOrders, weeklyIntervals)
        }
      };

      res.json(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Employee analytics endpoint (similar to admin but with access control)
  app.get("/api/employee/analytics", requireEmployeeAccess, async (req, res) => {
    try {
      console.log('Fetching employee analytics data');

      // Use the same query logic as admin analytics
      const [deposits, orders] = await Promise.all([
        db.query.sepaDeposits.findMany({
          where: not(eq(sepaDeposits.status, 'failed'))
        }),
        db.query.usdtOrders.findMany({
          where: not(eq(usdtOrders.status, 'failed'))
        })
      ]);

      // Use the same calculation logic as admin analytics
      const depositCount = deposits.length;
      const depositAmount = deposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const orderCount = orders.length;
      const orderAmount = orders.reduce((sum, o) => sum + Number(o.amountUsd || 0), 0);

      const uniqueUsers = new Set([
        ...deposits.map(d => d.userId),
        ...orders.map(o => o.userId)
      ]).size;

      const [{ count: totalClients }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(
          not(eq(users.is_admin, true)),
          not(eq(users.is_employee, true))
        ));

      // Get time periods
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Filter transactions
      const dailyDeposits = deposits.filter(d => safeDate(d.createdAt) >= today);
      const dailyOrders = orders.filter(o => safeDate(o.createdAt) >= today);

      const weeklyDeposits = deposits.filter(d => safeDate(d.createdAt) >= startOfWeek);
      const weeklyOrders = orders.filter(o => safeDate(o.createdAt) >= startOfWeek);

      const monthlyDeposits = deposits.filter(d => safeDate(d.createdAt) >= startOfMonth);
      const monthlyOrders = orders.filter(o => safeDate(d.createdAt) >= startOfMonth);

      // Safely calculate total amounts
      const dailyTotalAmount = [...dailyDeposits, ...dailyOrders].reduce((sum, tx) => {
        let txAmount = 0;
        if ('amount' in tx && tx.amount) {
          txAmount = parseFloat(tx.amount.toString());
        } else if ('amountUsd' in tx && tx.amountUsd) {
          txAmount = parseFloat(tx.amountUsd.toString());
        }
        return sum + txAmount;
      }, 0);

      const weeklyTotalAmount = [...weeklyDeposits, ...weeklyOrders].reduce((sum, tx) => {
        let txAmount = 0;
        if ('amount' in tx && tx.amount) {
          txAmount = parseFloat(tx.amount.toString());
        } else if ('amountUsd' in tx && tx.amountUsd) {
          txAmount = parseFloat(tx.amountUsd.toString());
        }
        return sum + txAmount;
      }, 0);

      const monthlyTotalAmount = [...monthlyDeposits, ...monthlyOrders].reduce((sum, tx) => {
        let txAmount = 0;
        if ('amount' in tx && tx.amount) {
          txAmount = parseFloat(tx.amount.toString());
        } else if ('amountUsd' in tx && tx.amountUsd) {
          txAmount = parseFloat(tx.amountUsd.toString());
        }
        return sum + txAmount;
      }, 0);

      // Commission rate constant for SEPA deposits (updated from 16% to 10%)
      const COMMISSION_RATE = 0.10; // 10%
      
      // Calculate commission amounts for different time periods
      const calculateCommissionAmount = (deposits: any[]) => {
        return deposits.reduce((sum, d) => {
          // If the record already has commissionFee, use it
          if (d.commissionFee) {
            return sum + Number(d.commissionFee);
          } else {
            // Otherwise calculate it based on the amount and commission rate
            // Since amount in DB is already after commission, we need to calculate back
            const amount = Number(d.amount || 0);
            // Original amount = amount / (1 - COMMISSION_RATE)
            const originalAmount = amount / (1 - COMMISSION_RATE);
            const commissionAmount = originalAmount * COMMISSION_RATE;
            return sum + commissionAmount;
          }
        }, 0);
      };
      
      // Calculate commission amounts for all time periods
      const depositCommissionAmount = calculateCommissionAmount(deposits);
      const dailyDepositCommissionAmount = calculateCommissionAmount(dailyDeposits);
      const weeklyDepositCommissionAmount = calculateCommissionAmount(weeklyDeposits);
      const monthlyDepositCommissionAmount = calculateCommissionAmount(monthlyDeposits);
      
      const analyticsData: AnalyticsData = {
        yearToDate: {
          deposits: {
            count: depositCount,
            amount: depositAmount,
            commissionAmount: depositCommissionAmount
          },
          orders: {
            count: orderCount,
            amount: orderAmount
          },
          totalTransactions: depositCount + orderCount,
          totalAmount: depositAmount + orderAmount,
          uniqueActiveUsers: uniqueUsers,
          totalClients,
          commissionRate: COMMISSION_RATE,
          contractors: {
            count: 0,
            referredDeposits: 0,
            referredAmount: 0,
            commissionAmount: 0
          }
        },
        daily: {
          totalTransactions: dailyDeposits.length + dailyOrders.length,
          totalAmount: dailyTotalAmount,
          uniqueUsers: new Set([
            ...dailyDeposits.map(d => d.userId),
            ...dailyOrders.map(o => o.userId)
          ]).size,
          depositCount: dailyDeposits.length,
          depositAmount: dailyDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0),
          depositCommissionAmount: dailyDepositCommissionAmount,
          orderCount: dailyOrders.length,
          orderAmount: dailyOrders.reduce((sum, o) => sum + Number(o.amountUsd || 0), 0),
          timeline: []
        },
        weekly: {
          totalTransactions: weeklyDeposits.length + weeklyOrders.length,
          totalAmount: weeklyTotalAmount,
          uniqueUsers: new Set([
            ...weeklyDeposits.map(d => d.userId),
            ...weeklyOrders.map(o => o.userId)
          ]).size,
          depositCount: weeklyDeposits.length,
          depositAmount: weeklyDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0),
          depositCommissionAmount: weeklyDepositCommissionAmount,
          orderCount: weeklyOrders.length,
          orderAmount: weeklyOrders.reduce((sum, o) => sum + Number(o.amountUsd || 0), 0),
          timeline: []
        },
        monthly: {
          totalTransactions: monthlyDeposits.length + monthlyOrders.length,
          totalAmount: monthlyTotalAmount,
          uniqueUsers: new Set([
            ...monthlyDeposits.map(d => d.userId),
            ...monthlyOrders.map(o => o.userId)
          ]).size,
          depositCount: monthlyDeposits.length,
          depositAmount: monthlyDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0),
          depositCommissionAmount: monthlyDepositCommissionAmount,
          orderCount: monthlyOrders.length,
          orderAmount: monthlyOrders.reduce((sum, o) => sum + Number(o.amountUsd || 0), 0),
          timeline: []
        }
      };

      res.json(analyticsData);
    } catch (error) {
      console.error('Error fetching employee analytics:', error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Handle KYC document status update with raw SQL for better compatibility
  app.patch("/api/admin/kyc/document/:id", requireAdminAccess, async (req, res) => {
    try {
      const docId = parseInt(req.params.id);
      const { status, adminComment } = req.body;

      console.log(`Updating KYC document status:`, {
        docId,
        status,
        adminComment: adminComment ? '[REDACTED]' : 'null',
      });

      if (isNaN(docId) || docId <= 0) {
        return res.status(400).json({
          message: "Invalid document ID: Must be a positive number"
        });
      }

      const updateValues: any = {};
      if (status) updateValues.status = status;
      if (adminComment !== undefined) updateValues.adminComment = adminComment;

      // Use raw SQL to update the KYC document with simple set clauses
      const result = await db.execute(
        sql`UPDATE "kycDocuments" SET 
            status = ${updateValues.status || null}, 
            "adminComment" = ${updateValues.adminComment || null}
            WHERE id = ${docId} RETURNING *`
      );

      if (!result || result.length === 0) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.json(result[0]);
    } catch (error) {
      console.error('Error updating KYC document:', error);
      res.status(500).json({ message: "Failed to update document status" });
    }
  });

  // Get all KYC documents with user data
  app.get("/api/admin/kyc/documents", requireAdminAccess, async (req, res) => {
    try {
      console.log('Fetching all KYC documents');

      // Use raw SQL to query KYC documents to avoid schema issues
      const documents = await db.execute(
        sql`SELECT kd.*, u.id as "userId", u.username, u.email, u.kyc_status 
            FROM "kycDocuments" kd 
            JOIN users u ON kd."userId" = u.id 
            ORDER BY kd."createdAt" DESC`
      );

      res.json(documents);
    } catch (error) {
      console.error('Error fetching KYC documents:', error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Get all users for KYC management
  app.get("/api/admin/kyc-users", requireAdminAccess, async (req, res) => {
    try {
      console.log('Fetching all users for KYC management');

      // Get all users with their KYC data
      const allUsers = await db.query.users.findMany({
        where: and(
          not(eq(users.is_admin, true)),
          not(eq(users.is_employee, true))
        ),
        orderBy: [desc(users.created_at)]
      });

      // Format the response
      const kycUsers = allUsers.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        kycStatus: user.kyc_status,
        sumsubApplicantId: user.sumsub_applicant_id,
        sumsubInspectionId: user.sumsub_inspection_id,
        sumsubReviewStatus: user.sumsub_review_status,
        sumsubReviewResult: user.sumsub_review_result,
        manualOverrideEnabled: user.manual_override_enabled,
        manualOverrideReason: user.manual_override_reason,
        manualOverrideBy: user.manual_override_by,
        manualOverrideAt: user.manual_override_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }));

      res.json(kycUsers);
    } catch (error) {
      console.error('Error fetching KYC users:', error);
      res.status(500).json({ message: "Failed to fetch KYC users" });
    }
  });

  // Admin KYC approval/rejection endpoint
  app.post("/api/admin/kyc-users/:userId/approve", requireAdminAccess, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { reason } = req.body;
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({ message: "Admin authentication required" });
      }

      // Update user's KYC status
      await db.update(users)
        .set({
          kyc_status: 'approved',
          manual_override_enabled: true,
          manual_override_reason: reason,
          manual_override_by: adminId,
          manual_override_at: new Date(),
          updated_at: new Date()
        })
        .where(eq(users.id, userId));

      // Send Telegram notification for KYC status update
      try {
        console.log(`[Admin KYC Approve] Sending Telegram notification for KYC approval: user ${userId}`);
        const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/telegram/internal/notify/kyc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId, status: 'approved' })
        });
        if (!response.ok) {
          console.error('[Admin KYC Approve] Failed to send KYC notification:', await response.text());
        } else {
          console.log('[Admin KYC Approve] KYC notification sent successfully');
        }
      } catch (notificationError) {
        console.error('[Admin KYC Approve] Error sending KYC notification:', notificationError);
      }

      res.json({ message: "KYC status approved successfully" });
    } catch (error) {
      console.error('Error approving KYC:', error);
      res.status(500).json({ message: "Failed to approve KYC" });
    }
  });

  app.post("/api/admin/kyc-users/:userId/reject", requireAdminAccess, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { reason } = req.body;
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({ message: "Admin authentication required" });
      }

      // Update user's KYC status
      await db.update(users)
        .set({
          kyc_status: 'rejected',
          manual_override_enabled: true,
          manual_override_reason: reason,
          manual_override_by: adminId,
          manual_override_at: new Date(),
          updated_at: new Date()
        })
        .where(eq(users.id, userId));

      // Send Telegram notification for KYC status update
      try {
        console.log(`[Admin KYC Reject] Sending Telegram notification for KYC rejection: user ${userId}`);
        const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/telegram/internal/notify/kyc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: userId, status: 'rejected' })
        });
        if (!response.ok) {
          console.error('[Admin KYC Reject] Failed to send KYC notification:', await response.text());
        } else {
          console.log('[Admin KYC Reject] KYC notification sent successfully');
        }
      } catch (notificationError) {
        console.error('[Admin KYC Reject] Error sending KYC notification:', notificationError);
      }

      res.json({ message: "KYC status rejected successfully" });
    } catch (error) {
      console.error('Error rejecting KYC:', error);
      res.status(500).json({ message: "Failed to reject KYC" });
    }
  });

  app.post("/api/admin/kyc-users/:userId/toggle-override", requireAdminAccess, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { enabled, reason } = req.body;
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({ message: "Admin authentication required" });
      }

      // Update user's manual override settings
      await db.update(users)
        .set({
          manual_override_enabled: enabled,
          manual_override_reason: reason,
          manual_override_by: adminId,
          manual_override_at: new Date(),
          updated_at: new Date()
        })
        .where(eq(users.id, userId));

      res.json({ message: `Manual override ${enabled ? 'enabled' : 'disabled'} successfully` });
    } catch (error) {
      console.error('Error toggling manual override:', error);
      res.status(500).json({ message: "Failed to toggle manual override" });
    }
  });

  // Update user's KYC status
  app.patch("/api/admin/kyc/user/:id", requireAdminAccess, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { kycStatus } = req.body;

      console.log(`Updating user KYC status:`, {
        userId,
        kycStatus,
      });

      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({
          message: "Invalid user ID: Must be a positive number"
        });
      }

      // Convert "verified" to "approved" for storage
      const statusToStore = kycStatus === 'verified' ? 'approved' : kycStatus;

      // Update both snake_case and camelCase fields to ensure consistency
      const updateValues: any = {
        kyc_status: statusToStore,
        updatedAt: new Date()
      };

      // Check if camelCase field exists in schema before trying to update it
      const userFields = Object.keys(users);
      if (userFields.includes('kycStatus')) {
        updateValues.kycStatus = statusToStore;
      }

      await db
        .update(users)
        .set(updateValues)
        .where(eq(users.id, userId));

      // Get updated user for response
      const [updatedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      res.json({
        id: updatedUser.id,
        kyc_status: updatedUser.kyc_status,
        message: `KYC status updated to ${statusToStore}`
      });
    } catch (error) {
      console.error('Error updating user KYC status:', error);
      res.status(500).json({ message: "Failed to update KYC status" });
    }
  });

  // ENDPOINT: Get all clients for admin dashboard
  app.get("/api/admin/clients", requireAdminAccess, async (req, res) => {
    try {
      console.log('Fetching clients for user:', {
        id: req.user?.id,
        username: req.user?.username,
        userGroup: req.user?.userGroup,
        isAdmin: req.user?.isAdmin
      });

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const search = req.query.search as string || '';

      // Build search conditions
      const baseConditions = and(
        not(eq(users.is_admin, true)),
        not(eq(users.is_employee, true))
      );

      let searchConditions = baseConditions;
      if (search) {
        searchConditions = and(
          baseConditions,
          or(
            ilike(users.username, `%${search}%`),
            ilike(users.email, `%${search}%`),
            ilike(users.full_name, `%${search}%`)
          )
        );
      }

      // Get total count first
      const [{ count: totalClients }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(searchConditions);

      // Then get paginated clients
      const clients = await db.query.users.findMany({
        where: searchConditions,
        with: {
          kycDocuments: true,
          usdtOrders: true,
        },
        limit,
        offset,
        orderBy: [desc(users.created_at)]
      });
      
      // Now manually get the sepaDeposits for each client to avoid the relation issue
      const clientIds = clients.map(client => client.id);
      const allDeposits = await db.query.sepaDeposits.findMany({
        where: inArray(sepaDeposits.userId, clientIds)
      });
      
      // Add the deposits to each client manually
      const clientsWithDeposits = clients.map(client => {
        const deposits = allDeposits.filter(dep => dep.userId === client.id);
        return {
          ...client,
          sepaDeposits: deposits
        };
      });

      console.log(`Found ${clients.length} clients (page ${page} of ${Math.ceil(totalClients / limit)})`);

      const clientsWithMetrics = clients.map(client => ({
        id: client.id,
        username: client.username,
        email: client.email || '',
        fullName: client.full_name || '',
        userGroup: client.user_group || 'standard',
        kycStatus: client.kyc_status || 'pending',
        balance: client.balance,
        lastLoginAt: client.last_login_at,
        kycDocumentsCount: client.kycDocuments?.length || 0,
        transactionsCount: (client.sepaDeposits?.length || 0) + (client.usdtOrders?.length || 0)
      }));

      res.json({
        clients: clientsWithMetrics,
        totalPages: Math.ceil(totalClients / limit),
        currentPage: page,
        totalClients
      });

    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // ENDPOINT: Delete a client (admin only)
  app.delete("/api/admin/clients/:id", requireAdminAccess, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);

      // Check if user exists and is not an admin/employee
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, clientId),
            not(eq(users.is_admin, true)),
            not(eq(users.is_employee, true))
          )
        )
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found or cannot be deleted" });
      }

      console.log(`Starting deletion process for user: ${user.username} (ID: ${clientId})`);

      // Start a transaction to ensure data consistency
      await db.transaction(async (tx) => {
        // Delete related records first to avoid foreign key constraint violations
        
        // Delete KYC documents
        await tx.delete(kycDocuments).where(eq(kycDocuments.userId, clientId));
        
        // Delete chat history
        await tx.delete(chatHistory).where(eq(chatHistory.userId, clientId));
        
        // Delete SEPA deposits
        await tx.delete(sepaDeposits).where(eq(sepaDeposits.userId, clientId));
        
        // Delete USDT orders
        await tx.delete(usdtOrders).where(eq(usdtOrders.userId, clientId));
        
        // Delete USDC orders
        await tx.delete(usdcOrders).where(eq(usdcOrders.userId, clientId));
        
        // Delete user permissions
        await tx.delete(userPermissions).where(eq(userPermissions.user_id, clientId));
        
        // Delete verification codes
        await tx.delete(verificationCodes).where(eq(verificationCodes.userId, clientId));
        
        // Delete user sessions
        await tx.delete(userSessions).where(eq(userSessions.user_id, clientId));
        
        // Delete profile update requests
        try {
          await tx.delete(profileUpdateRequests).where(eq(profileUpdateRequests.userId, clientId));
        } catch (e) {
          console.log('No profile update requests to delete');
        }
        
        // Finally, delete the user
        await tx.delete(users).where(eq(users.id, clientId));
      });

      console.log('User and all associated data deleted successfully:', clientId);
      res.json({ message: "User and all associated data deleted successfully" });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ 
        message: "Failed to delete user",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ENDPOINT: Get client details
  app.get("/api/admin/clients/:id", requireAdminAccess, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      console.log(`Fetching client details for ID: ${clientId}`);

      if (isNaN(clientId) || clientId <= 0) {
        return res.status(400).json({ message: "Invalid client ID" });
      }

      // Get client with basic information
      const client = await db.query.users.findFirst({
        where: eq(users.id, clientId),
        with: {
          kycDocuments: true,
        }
      });

      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      console.log(`Found client: ${client.username} (${client.id})`);

      // Fetch SEPA deposits for this client
      let deposits: any[] = [];
      try {
        deposits = await db.query.sepaDeposits.findMany({
          where: eq(sepaDeposits.userId, clientId)
        });
        console.log(`Found ${deposits.length} SEPA deposits for client ${clientId}`);
      } catch (depositError: any) {
        console.warn('Could not fetch SEPA deposits:', depositError.message);
      }

      // Fetch USDT orders for this client
      let usdtOrders: any[] = [];
      try {
        usdtOrders = await db.query.usdtOrders.findMany({
          where: eq(usdtOrders.userId, clientId)
        });
        console.log(`Found ${usdtOrders.length} USDT orders for client ${clientId}`);
      } catch (usdtError: any) {
        console.warn('Could not fetch USDT orders:', usdtError.message.message);
      }

      // Get USDC orders with a try-catch
      let usdcOrdersResults: any[] = [];
      try {
        // Fix the type error by directly importing the usdcOrders schema
        // and using it correctly in the where clause
        const { usdcOrders: usdcOrdersSchema } = await import("@db/schema");

        usdcOrdersResults = await db.query.usdcOrders.findMany({                where: eq(usdcOrdersSchema.userId, clientId)
      });
        console.log(`Found ${usdcOrdersResults.length} USDC orders for client ${clientId}`);
      } catch (usdcError: any) {
        console.warn('Could not fetch USDC orders:', usdcError.message);
      }

      // Log the actual transaction statuses for debugging
      console.log('SEPA deposit statuses:', deposits.map(d => ({ id: d.id, status: d.status })));
      console.log('USDC order statuses:', usdcOrdersResults.map(o => ({ id: o.id, status: o.status })));
      console.log('USDT order statuses:', usdtOrders.map(o => ({ id: o.id, status: o.status })));

      // Get the user's current balance
      console.log(`Client ${clientId} balance: ${client.balance} ${client.balanceCurrency || 'EUR'}`);

      // Prepare transactions data
      let transactions = [
        ...deposits.map(d => ({
          id: `sepa-${d.id}`,
          type: 'deposit',
          amount: parseFloat(d.amount?.toString() || "0"),
          currency: d.currency || 'EUR',
          status: d.status,
          createdAt: d.createdAt?.toISOString(),
        })),
        ...usdtOrders.map(o => ({
          id: `usdt-${o.id}`,
          type: 'usdt',
          amount: parseFloat(o.amountUsd?.toString() || "0"),
          currency: 'USDT',
          status: o.status,
          createdAt: o.createdAt?.toISOString(),
          txHash: o.txHash
        })),
        ...usdcOrdersResults.map(o => ({
          id: `usdc-${o.id}`,
          type: 'usdc',
          amount: parseFloat(o.amountUsd?.toString() || "0"),
          currency: 'USDC',
          status: o.status,
          createdAt: o.createdAt?.toISOString(),
          txHash: o.txHash
        }))
      ];

      // Sort transactions by date
      transactions.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date();
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date();
        return dateB.getTime() - dateA.getTime();
      });

      console.log(`Total transactions for client ${clientId}: ${transactions.length}`);

      // Add recent activity for the user
      const recentActivity = transactions.slice(0, 5).map((t, index) => ({
        id: index + 1,
        type: t.type,
        description: `${t.type.charAt(0).toUpperCase() + t.type.slice(1)} of ${parseFloat(t.amount.toString()).toFixed(2)} ${t.currency}`,
        createdAt: t.createdAt
      }));

      // Include the hashed password and 2FA information for admin users
      // Make sure to properly map all database fields to their camelCase versions
      // This ensures consistency across the frontend
      const clientDetail = {
        id: client.id,
        username: client.username,
        password: client.password, // Include hashed password for admin view
        fullName: client.full_name || '', // Use snake_case field names from DB
        email: client.email || '',
        phoneNumber: client.phone_number || '', // Use snake_case field names from DB
        address: client.address || '',
        countryOfResidence: client.country_of_residence || '', // Use snake_case field names from DB
        gender: client.gender || '',
        userGroup: client.user_group || 'standard',
        kycStatus: client.kyc_status || 'not_started',
        balance: client.balance || '0',
        balanceCurrency: client.balance_currency || 'USD',
        isAdmin: !!client.is_admin,
        isEmployee: !!client.is_employee,
        twoFactorEnabled: client.two_factor_enabled || false,
        twoFactorMethod: client.two_factor_method || null,
        createdAt: client.created_at?.toISOString() || new Date().toISOString(),
        updatedAt: client.updated_at?.toISOString() || new Date().toISOString(),
        lastLoginAt: client.last_login_at?.toISOString() || null,
        profileUpdated: !!client.profile_updated,
        transactions,
        recentActivity
      };

      console.log('Returning client details:', {
        id: clientDetail.id,
        username: clientDetail.username,
        transactionCount: transactions.length,
        balance: clientDetail.balance,
        hasPassword: !!clientDetail.password
      });

      res.json(clientDetail);
    } catch (error) {
      console.error('Error fetching client details:', error);
      res.status(500).json({ message: "Failed to fetch client details" });
    }
  });

  // ENDPOINT: Update client profile data
  app.patch("/api/admin/clients/:id/profile", requireAdminAccess, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const { fullName, email, phoneNumber, address, countryOfResidence, gender } = req.body;

      console.log(`Updating profile for client ${clientId}`, {
        fullName,
        email,
        phoneNumber,
        address,
        countryOfResidence,
        gender
      });

      // Map frontend fields to database column names
      const dbUpdateData = {
        full_name: fullName,
        email: email,
        phone_number: phoneNumber,
        address: address,
        country_of_residence: countryOfResidence,
        gender: gender,
        updated_at: new Date(),
        profile_updated: true
      };

      // Update the user profile
      await db
        .update(users)
        .set(dbUpdateData)
        .where(eq(users.id, clientId));

      console.log(`Profile updated successfully for client ${clientId}`);

      // Get updated user
      const [updatedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, clientId))
        .limit(1);

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found after update" });
      }

      // Map database fields to frontend format for response
      // Ensure we properly handle all fields and provide default values for missing ones
      const userData = {
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.full_name || '', // Use snake_case field names from DB
        email: updatedUser.email || '',
        phoneNumber: updatedUser.phone_number || '', // Use snake_case field names from DB
        countryOfResidence: updatedUser.country_of_residence || '', // Use snake_case field names from DB
        address: updatedUser.address || '',
        gender: updatedUser.gender || '',
        isAdmin: !!updatedUser.is_admin,
        isEmployee: !!updatedUser.is_employee,
        userGroup: updatedUser.user_group || 'standard',
        kycStatus: updatedUser.kyc_status || 'pending',
        balance: updatedUser.balance || '0',
        balanceCurrency: updatedUser.balance_currency || 'USD',
        lastLoginAt: updatedUser.last_login_at?.toISOString() || null,
        profileUpdated: !!updatedUser.profile_updated
      };

      res.json({
        message: "Profile updated successfully",
        user: userData
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // ENDPOINT: Update client KYC status
  app.patch("/api/admin/clients/:id/kyc", requireAdminAccess, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const { status } = req.body;

      console.log(`Updating KYC status for client ${clientId} to ${status}`);

      if (!['approved', 'pending', 'rejected', 'not_started', 'in_progress', 'verified'].includes(status)) {
        return res.status(400).json({ message: "Invalid KYC status" });
      }

      // Map 'verified' to 'approved' if needed for backward compatibility
      const statusToStore = status === 'verified' ? 'approved' : status;

      // Update both snake_case and camelCase fields to ensure consistency
      const updateValues: any = {
        kyc_status: statusToStore,
        updatedAt: new Date()
      };

      // Check if camelCase field exists in schema before trying to update it
      const userFields = Object.keys(users);
      if (userFields.includes('kycStatus')) {
        updateValues.kycStatus = statusToStore;
      }

      await db
        .update(users)
        .set(updateValues)
        .where(eq(users.id, clientId));

      console.log(`KYC status updated successfully for client ${clientId} to ${statusToStore}`);
      res.json({ message: "KYC status updated", status: statusToStore });
    } catch (error) {
      console.error('Error updating KYC status:', error);
      res.status(500).json({ message: "Failed to update KYC status" });
    }
  });

  // ENDPOINT: Update user balance from admin interface
  app.patch("/api/admin/clients/:id/balance", requireAdminAccess, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      const { balance, currency, reason } = req.body;

      if (isNaN(parseFloat(balance)) || !currency) {
        return res.status(400).json({ message: "Invalid balance update data" });
      }

      // Update user balance
      await db
        .update(users)
        .set({
          balance: balance.toString(),
          balance_currency: currency,
          updated_at: new Date()
        })
        .where(eq(users.id, clientId));

      console.log(`Updated user ${clientId} balance to ${balance} ${currency} (${reason || 'manual update'})`);

      // Get updated user
      const [updatedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, clientId))
        .limit(1);

      res.json({
        message: "Balance updated successfully",
        user: {
          id: updatedUser.id,
          balance: updatedUser.balance,
          balanceCurrency: updatedUser.balance_currency
        }
      });
    } catch (error) {
      console.error('Error updating user balance:', error);
      res.status(500).json({ message: "Failed to update balance" });
    }
  });

  // Adding a PATCH endpoint for admin to update SEPA deposit status
  app.patch("/api/admin/deposits/:id", requireAdminAccess, async (req, res) => {
    try {
      const depositId = parseInt(req.params.id);
      const { status } = req.body;

      if (isNaN(depositId) || depositId <= 0) {
        return res.status(400).json({ 
          message: "Invalid deposit ID: Must be a positive number",
          code: "invalid_deposit_id"
        });
      }

      console.log(`Updating SEPA deposit status:`, {
        depositId,
        status,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });

      // Validate the status value
      const validStatuses = ['pending', 'processing', 'successful', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status: Must be one of ${validStatuses.join(', ')}`,
          code: "invalid_status"
        });
      }

      // First, get the deposit to check its current status
      const existingDeposit = await db.query.sepaDeposits.findFirst({
        where: eq(sepaDeposits.id, depositId)
      });

      if (!existingDeposit) {
        return res.status(404).json({ 
          message: "Deposit not found", 
          code: "deposit_not_found" 
        });
      }

      // Get the deposit user and their current balance
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, existingDeposit.userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ 
          message: "User not found", 
          code: "user_not_found" 
        });
      }

      // Get deposit amount and current balance
      const depositAmount = parseFloat(existingDeposit.amount?.toString() || "0");
      const currentBalance = parseFloat(user.balance?.toString() || "0");
      console.log(`Deposit ${depositId} amount: ${depositAmount} ${existingDeposit.currency}`);
      console.log(`User ${user.id} current balance: ${currentBalance} ${user.balanceCurrency || 'USD'}`);

      // If updating deposit to "successful", add amount to user balance
      // If changing from "successful" to something else, subtract amount
      let newBalance = currentBalance;
      const previousStatus = existingDeposit.status;
      
      // Use directly imported functions from exchange-rates service
      // Perform database updates within a transaction
      await db.transaction(async (tx) => {
        // Update the deposit status first
        await tx
          .update(sepaDeposits)
          .set({ 
            status, 
            updated_at: new Date(),
            completed_at: status === 'successful' ? new Date() : null
          })
          .where(eq(sepaDeposits.id, depositId));
        
        // Handle balance update with proper currency conversion
        if (status === 'successful' && previousStatus !== 'successful') {
          // Convert deposit amount to user's currency before adding to balance
          const depositCurrency = existingDeposit.currency || 'EUR';
          const userCurrency = user.balanceCurrency || 'USD';
          
          console.log(`Deposit currency: ${depositCurrency}, User currency: ${userCurrency}`);
          
          try {
            // Get the exchange rates
            const exchangeRates = await getExchangeRates();
            console.log('Exchange rates fetched:', {
              timestamp: exchangeRates.updatedAt,
              'EUR/USD': exchangeRates.EUR.USD,
              'EUR/GBP': exchangeRates.EUR.GBP,
              'EUR/CHF': exchangeRates.EUR.CHF
            });
            
            // Convert the deposit amount to the user's preferred currency
            let convertedAmount = depositAmount;
            
            if (depositCurrency !== userCurrency) {
              console.log(`Converting ${depositAmount} ${depositCurrency} to ${userCurrency}`);
              convertedAmount = await convertCurrency(depositAmount, depositCurrency, userCurrency);
              console.log(`Converted amount: ${convertedAmount} ${userCurrency}`);
            }
            
            // Now add the converted amount to the user's balance
            newBalance = Number((currentBalance + convertedAmount).toFixed(2));
            console.log(`Changing deposit ${depositId} from '${previousStatus}' to 'successful', adding ${convertedAmount} ${userCurrency} to balance: ${currentBalance} -> ${newBalance}`);
          } catch (error) {
            console.error(`Error converting deposit amount: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error(`Failed to convert deposit amount: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else if (status !== 'successful' && previousStatus === 'successful') {
          // For withdrawal of successful status, we need to convert the amount back
          const depositCurrency = existingDeposit.currency || 'EUR';
          const userCurrency = user.balanceCurrency || 'USD';
          
          try {
            // Get the exchange rates
            const exchangeRates = await getExchangeRates();
            console.log('Exchange rates for withdrawal:', {
              timestamp: exchangeRates.updatedAt,
              'EUR/USD': exchangeRates.EUR.USD,
              'USD/EUR': exchangeRates.USD.EUR
            });
            
            // Convert the deposit amount to the user's preferred currency
            let convertedAmount = depositAmount;
            
            if (depositCurrency !== userCurrency) {
              console.log(`Converting ${depositAmount} ${depositCurrency} to ${userCurrency} for withdrawal`);
              convertedAmount = await convertCurrency(depositAmount, depositCurrency, userCurrency);
              console.log(`Converted amount for withdrawal: ${convertedAmount} ${userCurrency}`);
            }
            
            // Subtract the converted amount from the user's balance
            newBalance = Math.max(0, Number((currentBalance - convertedAmount).toFixed(2))); // Prevent negative balance
            console.log(`Changing deposit ${depositId} from 'successful' to '${status}', subtracting ${convertedAmount} ${userCurrency} from balance: ${currentBalance} -> ${newBalance}`);
          } catch (error) {
            console.error(`Error converting deposit amount for withdrawal: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw new Error(`Failed to convert deposit amount for withdrawal: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        
        // Update user balance if it changed
        if (newBalance !== currentBalance) {
          await tx
            .update(users)
            .set({ 
              balance: newBalance.toString(),
              balance_currency: user.balance_currency || 'USD' // Ensure we keep the user's currency
            })
            .where(eq(users.id, existingDeposit.userId));
        }
      });

      // Get updated deposit for response
      const updatedDeposit = await db.query.sepaDeposits.findFirst({
        where: eq(sepaDeposits.id, depositId)
      });

      if (!updatedDeposit) {
        throw new Error("Failed to retrieve updated deposit");
      }

      // Get updated user to verify balance change
      const [updatedUser] = await db
        .select({
          id: users.id,
          balance: users.balance,
          balanceCurrency: users.balance_currency
        })
        .from(users)
        .where(eq(users.id, existingDeposit.userId))
        .limit(1);

      console.log(`Successfully updated SEPA deposit status:`, {
        depositId,
        newStatus: status,
        previousStatus,
        previousBalance: currentBalance,
        newBalance: updatedUser.balance,
        currency: updatedUser.balanceCurrency
      });

      // Send Telegram notifications asynchronously (non-blocking) for status changes
      if (status !== previousStatus) {
        setImmediate(async () => {
          try {
            console.log(`[Telegram] Sending SEPA deposit status change notification - Status changed from ${previousStatus} to ${status}`);
            
            // Send to group bot system if user has referral code
            if (user.referred_by) {
              console.log(`[Telegram] User has referral code: ${user.referred_by}, sending status change to group bot`);
              try {
                const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/telegram/internal/notify/transaction`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    userId: user.id,
                    type: 'SEPA',
                    amount: depositAmount,
                    currency: existingDeposit.currency || 'EUR',
                    status: status,
                    reference: updatedDeposit.reference
                  }),
                  timeout: 5000 // 5 second timeout to prevent hanging
                });
                if (!response.ok) {
                  console.error('[Telegram] Failed to send group bot status change notification:', await response.text());
                } else {
                  console.log('[Telegram] Group bot status change notification sent successfully');
                }
              } catch (groupBotError) {
                console.error('[Telegram] Group bot status change notification error:', groupBotError);
              }
            }
            
            // Also send to legacy telegram service for status changes  
            try {
              // Import telegramService dynamically to avoid import issues
              const { telegramService } = await import('./services/telegram');
              const message = telegramService.formatTransaction(
                'SEPA',
                depositAmount,
                existingDeposit.currency || 'EUR',
                user.username,
                user.full_name || user.username,
                undefined,
                updatedDeposit.reference || '',
                status // Pass the new status
              );
              await telegramService.sendTransactionNotification(message);
              console.log('[Telegram] Legacy service status change notification sent successfully');
            } catch (legacyError) {
              console.error('[Telegram] Legacy service status change notification error:', legacyError);
            }
          } catch (telegramError) {
            console.error('[Telegram] Error sending SEPA deposit status change notifications:', telegramError);
          }
        });
      }

      res.json({
        ...updatedDeposit,
        user: {
          id: updatedUser.id,
          balance: updatedUser.balance,
          balance_currency: updatedUser.balanceCurrency
        }
      });
    } catch (error) {
      console.error('Error updating SEPA deposit status:', error);
      res.status(500).json({ 
        message: "Failed to update deposit status",
        error: error instanceof Error ? error.message : "Unknown error",
        code: "failed_to_update_transaction_status"
      });
    }
  });

  // Adding a PATCH endpoint for admin to update USDT order status
  app.patch("/api/admin/usdt/:id", requireAdminAccess, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status } = req.body;

      if (isNaN(orderId) || orderId <= 0) {
        return res.status(400).json({ message: "Invalid order ID: Must be a positive number" });
      }

      console.log(`Updating USDT order status:`, {
        orderId,
        status,
        userId: req.user?.id
      });

      // Validate the status value
      const validStatuses = ['pending', 'processing', 'successful', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status: Must be one of ${validStatuses.join(', ')}` });
      }

      // Update the order status
      const result = await db
        .update(usdtOrders)
        .set({ 
          status, 
          updated_at: new Date() 
        })
        .where(eq(usdtOrders.id, orderId))
        .returning();

      if (!result || result.length === 0) {
        return res.status(404).json({ message: "USDT order not found" });
      }

      console.log(`Successfully updated USDT order status:`, {
        orderId,
        newStatus: status,
        result: result[0]
      });

      res.json(result[0]);
    } catch (error) {
      console.error('Error updating USDT order status:', error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Adding a PATCH endpoint for admin to update USDC order status
  app.patch("/api/admin/usdc/:id", requireAdminAccess, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { status, txHash: customTxHash } = req.body; // Extract custom txHash if provided

      if (isNaN(orderId) || orderId <= 0) {
        return res.status(400).json({ message: "Invalid order ID: Must be a positive number" });
      }

      console.log(`Updating USDC order:`, {
        id: orderId,
        status,
        customTxHash: customTxHash ? '[CUSTOM HASH PROVIDED]' : 'not provided',
        timestamp: new Date().toISOString()
      });

      // Validate the status value
      const validStatuses = ['pending', 'processing', 'successful', 'completed', 'failed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status: Must be one of ${validStatuses.join(', ')}` });
      }

      // Get the USDC order to check its current status
      const [order] = await db
        .select()
        .from(usdcOrders)
        .where(eq(usdcOrders.id, orderId))
        .limit(1);

      if (!order) {
        return res.status(404).json({ message: "USDC order not found" });
      }

      // Get the order's user and their current balance
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, order.userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get order amount and current balance
      const orderAmount = parseFloat(order.amountUsdc?.toString() || "0");
      const currentBalance = parseFloat(user.balance?.toString() || "0");
      const previousStatus = order.status;

      console.log(`USDC order current status: ${previousStatus}, changing to: ${status}`);
      console.log(`USDC order ${orderId} amount: ${orderAmount} USDC`);
      console.log(`User ${user.id} current balance: ${currentBalance} ${user.balanceCurrency || 'EUR'}`);

      // Generate a transaction hash for successful orders or use the provided one
      const txHash = status === 'successful'
        ? (customTxHash || `${Date.now().toString(16)}-${Math.random().toString(16).substring(2, 10)}`)
        : order.txHash; // Keep existing txHash if status isn't changing to successful

      console.log(`Using transaction hash: ${txHash || 'none'} (${customTxHash ? 'custom' : 'generated/existing'})`);

      // Calculate new balance based on status change
      // Note: For USDC, we've already deducted the amount when the order was created
      // We only need to ADD back funds if the order is rejected/failed
      let newBalance = currentBalance;

      if (status === 'failed' && previousStatus !== 'failed') {
        // Refund the order amount when order fails
        newBalance = currentBalance + orderAmount;
        console.log(`Changing USDC order ${orderId} from '${previousStatus}' to 'failed', refunding ${orderAmount} to balance: ${currentBalance} -> ${newBalance}`);
      }

      // Perform database updates within a transaction
      await db.transaction(async (tx) => {
        // Update the USDC order
        await tx
          .update(usdcOrders)
          .set({ 
            status, 
            txHash: txHash,
            completedAt: status === 'successful' ? new Date() : null
          })
          .where(eq(usdcOrders.id, orderId));

        // Update user balance if needed
        if (newBalance !== currentBalance) {
          await tx
            .update(users)
            .set({ 
              balance: newBalance.toString()
            })
            .where(eq(users.id, order.userId));
        }
      });

      // Get updated order for response
      const [updatedOrder] = await db
        .select()
        .from(usdcOrders)
        .where(eq(usdcOrders.id, orderId))
        .limit(1);

      // Get updated user to verify balance change
      const [updatedUser] = await db
        .select({
          id: users.id,
          balance: users.balance,
          balanceCurrency: users.balance_currency
        })
        .from(users)
        .where(eq(users.id, order.userId))
        .limit(1);

      console.log(`Successfully updated USDC order status:`, {
        orderId,
        previousStatus,
        newStatus: status,
        previousBalance: currentBalance,
        newBalance: updatedUser.balance,
        txHash: updatedOrder.txHash
      });

      // Send Telegram notifications asynchronously (non-blocking) for status changes
      if (status !== previousStatus) {
        setImmediate(async () => {
          try {
            console.log(`[Telegram] Sending USDC order status change notification - Status changed from ${previousStatus} to ${status}`);
            
            // Send to group bot system if user has referral code
            if (user.referred_by) {
              console.log(`[Telegram] User has referral code: ${user.referred_by}, sending USDC status change to group bot`);
              try {
                const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/telegram/internal/notify/transaction`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    userId: user.id,
                    type: 'USDC',
                    amount: parseFloat(updatedOrder.amountUsd || '0'),
                    currency: 'USD',
                    status: status,
                    reference: `ORDER-${updatedOrder.id}`
                  }),
                  timeout: 5000 // 5 second timeout to prevent hanging
                });
                
                if (!response.ok) {
                  console.error(`[Telegram] Failed to send USDC group bot status change notification: ${response.status}`);
                } else {
                  console.log('[Telegram] USDC group bot status change notification sent successfully');
                }
              } catch (groupBotError) {
                console.error('[Telegram] USDC group bot status change notification error:', groupBotError);
              }
            }
            
            // Send to legacy telegram service
            try {
              const { telegramService } = await import('../services/telegram');
              const amountUsd = parseFloat(updatedOrder.amountUsd || '0');
              
              const telegramMessage = telegramService.formatTransaction(
                'USDC',
                amountUsd,
                'USD',
                user.username,
                user.full_name || user.username,
                updatedOrder.txHash,
                `ORDER-${updatedOrder.id}`,
                status // Pass the new status
              );
              
              await telegramService.sendTransactionNotification(telegramMessage);
              console.log(`[Telegram] USDC legacy service status change notification sent successfully`);
            } catch (legacyError) {
              console.error('[Telegram] USDC legacy service status change notification error:', legacyError);
            }
          } catch (telegramError) {
            console.error("[Telegram] Error sending USDC status change notifications:", telegramError);
          }
        });
      }

      res.json({
        ...updatedOrder,
        user: {
          id: updatedUser.id,
          balance: updatedUser.balance,
          balanceCurrency: updatedUser.balanceCurrency
        }
      });
    } catch (error) {
      console.error('Error updating USDC order status:', error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  app.use(errorHandler);
  return httpServer;
}