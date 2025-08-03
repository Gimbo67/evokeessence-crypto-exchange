import { Request, Response } from "express";
import { db } from "@db/index";
import { eq, and, gte, count, desc, sql } from "drizzle-orm";
import { users, sepaDeposits, usdtOrders, usdcOrders, userPermissions, kycDocuments } from "@db/schema";
import { UserGroup } from "../types/user-groups";

/**
 * Controller for employee dashboard operations
 */

/**
 * Get dashboard statistics based on employee permissions
 * @param req - Express Request object
 * @param res - Express Response object
 */
export async function getDashboardStats(req: Request, res: Response) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = req.user.id;
    
    // Get user permissions
    const userPermissionsList = await db.query.userPermissions.findMany({
      where: eq(userPermissions.user_id, userId),
    });

    const permissions: Record<string, boolean> = {};
    userPermissionsList.forEach((permission) => {
      permissions[permission.permission_type] = true;
    });

    // Default stats structure
    const stats = {
      totalClients: 0,
      activeClients: 0,
      totalTransactions: 0,
      pendingTransactions: 0,
      pendingKyc: 0,
      recentDeposits: 0,
      dailyAmount: 0,
      permissions,
    };

    // Fetch client counts if employee has view_clients permission
    if (permissions["view_clients"]) {
      const clientsCount = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.is_admin, false));

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeClientsCount = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.is_admin, false),
            gte(users.last_login_at, thirtyDaysAgo)
          )
        );

      stats.totalClients = clientsCount[0]?.count || 0;
      stats.activeClients = activeClientsCount[0]?.count || 0;
    }

    // Fetch transaction data if employee has view_transactions permission
    if (permissions["view_transactions"]) {
      // Count all transactions
      const depositsCount = await db
        .select({ count: count() })
        .from(sepaDeposits);

      const usdtOrdersCount = await db
        .select({ count: count() })
        .from(usdtOrders);

      const usdcOrdersCount = await db
        .select({ count: count() })
        .from(usdcOrders);

      stats.totalTransactions = 
        (depositsCount[0]?.count || 0) + 
        (usdtOrdersCount[0]?.count || 0) + 
        (usdcOrdersCount[0]?.count || 0);

      // Count pending transactions
      const pendingDepositsCount = await db
        .select({ count: count() })
        .from(sepaDeposits)
        .where(eq(sepaDeposits.status, 'pending'));

      const pendingUsdtOrdersCount = await db
        .select({ count: count() })
        .from(usdtOrders)
        .where(eq(usdtOrders.status, 'pending'));

      const pendingUsdcOrdersCount = await db
        .select({ count: count() })
        .from(usdcOrders)
        .where(eq(usdcOrders.status, 'pending'));

      stats.pendingTransactions = 
        (pendingDepositsCount[0]?.count || 0) + 
        (pendingUsdtOrdersCount[0]?.count || 0) + 
        (pendingUsdcOrdersCount[0]?.count || 0);

      // Daily stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayDeposits = await db
        .select({ count: count() })
        .from(sepaDeposits)
        .where(gte(sepaDeposits.createdAt, today));

      stats.recentDeposits = todayDeposits[0]?.count || 0;

      // Calculate daily amount
      const dailyDepositsSum = await db
        .select({
          sum: sql<number>`COALESCE(SUM(${sepaDeposits.amount}), 0)`,
        })
        .from(sepaDeposits)
        .where(gte(sepaDeposits.createdAt, today));

      const dailyUsdtOrdersSum = await db
        .select({
          sum: sql<number>`COALESCE(SUM(${usdtOrders.amountUsdt}::numeric), 0)`,
        })
        .from(usdtOrders)
        .where(gte(usdtOrders.createdAt, today));

      const dailyUsdcOrdersSum = await db
        .select({
          sum: sql<number>`COALESCE(SUM(${usdcOrders.amountUsdc}::numeric), 0)`,
        })
        .from(usdcOrders)
        .where(gte(usdcOrders.createdAt, today));

      stats.dailyAmount = 
        (dailyDepositsSum[0]?.sum || 0) + 
        (dailyUsdtOrdersSum[0]?.sum || 0) + 
        (dailyUsdcOrdersSum[0]?.sum || 0);
    }

    // Fetch KYC data if employee has manage_kyc permission
    if (permissions["manage_kyc"]) {
      const pendingKycCount = await db
        .select({ count: count() })
        .from(kycDocuments)
        .where(eq(kycDocuments.status, 'pending'));

      stats.pendingKyc = pendingKycCount[0]?.count || 0;
    }

    // Return statistics
    return res.json({ stats });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get recent transactions and notifications for employee dashboard
 * @param req - Express Request object
 * @param res - Express Response object
 */
export async function getDashboardData(req: Request, res: Response) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = req.user.id;
    
    // Get user permissions
    const userPermissionsList = await db.query.userPermissions.findMany({
      where: eq(userPermissions.user_id, userId),
    });

    const permissions: Record<string, boolean> = {};
    userPermissionsList.forEach((permission) => {
      permissions[permission.permission_type] = true;
    });

    // Get user's stats directly instead of using the response
    // since the JSON method doesn't exist on Response
    let stats = {
      totalClients: 0,
      activeClients: 0,
      totalTransactions: 0,
      pendingTransactions: 0,
      pendingKyc: 0,
      recentDeposits: 0,
      dailyAmount: 0,
      permissions,
    };
    
    // Initialize response data
    const responseData: any = {
      recentTransactions: [],
      notifications: [],
      stats: stats,
    };

    // Fetch recent transactions if employee has view_transactions permission
    if (permissions["view_transactions"]) {
      // Get recent deposits
      const recentDeposits = await db.query.sepaDeposits.findMany({
        orderBy: desc(sepaDeposits.createdAt),
        limit: 5,
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              full_name: true,
            },
          },
        },
      });

      // Get recent USDT orders
      const recentUsdtOrders = await db.query.usdtOrders.findMany({
        orderBy: desc(usdtOrders.createdAt),
        limit: 5,
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              full_name: true,
            },
          },
        },
      });

      // Combine and format transactions
      const formattedDeposits = recentDeposits.map((deposit) => ({
        id: deposit.id,
        type: "deposit",
        amount: deposit.amount,
        currency: deposit.currency,
        status: deposit.status || "unknown",
        createdAt: deposit.createdAt ? deposit.createdAt.toISOString() : new Date().toISOString(),
        username: deposit.user.username,
        fullName: deposit.user.full_name,
        // Include additional data for frontend
        reference: deposit.reference,
        // Safely access fields with proper property names
        transactionNumber: deposit.reference, // Use reference as transaction number
        userId: deposit.userId // Use proper camelCase property
      }));

      const formattedOrders = recentUsdtOrders.map((order) => ({
        id: order.id,
        type: "order",
        amount: parseFloat(order.amountUsdt) || 0,
        currency: "USDT",
        status: order.status || "unknown",
        createdAt: order.createdAt ? order.createdAt.toISOString() : new Date().toISOString(),
        username: order.user.username,
        fullName: order.user.full_name,
        // Include additional data for frontend
        txHash: order.txHash, // Use proper camelCase property
        reference: order.id.toString(), // Use ID as reference if not available
        userId: order.userId // Use proper camelCase property
      }));

      // Combine all transactions, sort by date, and take the 10 most recent
      responseData.recentTransactions = [...formattedDeposits, ...formattedOrders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
    }

    // Create notifications based on permissions and statuses
    const notifications = [];

    if (permissions["view_transactions"] && responseData.stats.pendingTransactions > 0) {
      notifications.push({
        title: "Pending Transactions",
        message: `There are ${responseData.stats.pendingTransactions} transactions awaiting approval.`,
        type: "info",
        createdAt: new Date().toISOString(),
      });
    }

    if (permissions["manage_kyc"] && responseData.stats.pendingKyc > 0) {
      notifications.push({
        title: "KYC Verification Required",
        message: `${responseData.stats.pendingKyc} clients are waiting for KYC verification.`,
        type: "warning",
        createdAt: new Date().toISOString(),
      });
    }

    // Add a welcome notification if no other notifications exist
    if (notifications.length === 0) {
      notifications.push({
        title: "Welcome to your dashboard",
        message: "You can view your assigned tasks and activities here.",
        type: "info",
        createdAt: new Date().toISOString(),
      });
    }

    responseData.notifications = notifications;

    res.json(responseData);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get employee permissions
 * @param req - Express Request object
 * @param res - Express Response object
 */
export async function getEmployeePermissions(req: Request, res: Response) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userId = req.user.id;
    
    // Get user info
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user permissions
    const userPermissionsList = await db.query.userPermissions.findMany({
      where: eq(userPermissions.user_id, userId),
    });

    const permissions: Record<string, boolean> = {};
    userPermissionsList.forEach((permission) => {
      permissions[permission.permission_type] = true;
    });

    // Transform user data to camelCase for frontend
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      isAdmin: user.is_admin,
      isEmployee: user.is_employee,
      userGroup: user.user_group || null,
      permissions
    };

    // Return permissions alongside user info
    return res.json(userResponse);
  } catch (error) {
    console.error("Error fetching employee permissions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}