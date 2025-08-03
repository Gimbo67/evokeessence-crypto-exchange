import express, { Request, Response } from 'express';
import { db } from "@db";
import { sepaDeposits, usdtOrders, usdcOrders, users } from "@db/schema";
import { and, not, or, eq, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

// Create and export the router
export const transactionsRouter = express.Router();

// Helper function to fetch user transactions
async function getUserTransactions(userId: number) {
  try {
    console.log(`Fetching transactions for user ID: ${userId}`);

    // Get SEPA deposits
    const deposits = await db.query.sepaDeposits.findMany({
      where: eq(sepaDeposits.userId, userId),
      orderBy: [desc(sepaDeposits.createdAt)]
    });
    console.log(`Retrieved ${deposits.length} SEPA deposits for user ${userId}`);

    // Get USDT orders
    const usdtTransactions = await db.query.usdtOrders.findMany({
      where: eq(usdtOrders.userId, userId),
      orderBy: [desc(usdtOrders.createdAt)]
    });
    console.log(`Retrieved ${usdtTransactions.length} USDT transactions for user ${userId}`);

    // Get USDC orders with enhanced error handling
    let usdcTransactions: any[] = [];
    try {
      usdcTransactions = await db.query.usdcOrders.findMany({
        where: eq(usdcOrders.userId, userId),
        orderBy: [desc(usdcOrders.createdAt)]
      });
      console.log(`Retrieved ${usdcTransactions.length} USDC transactions for user ${userId}`);
    } catch (error: any) {
      console.error('Error fetching USDC orders:', error.message);
      // Don't throw - continue with empty array
    }

    // Combine all transactions
    const transactions = [
      ...deposits.map(d => {
        // Calculate the initial amount (pre-commission) by adding commission back to amount
        const amount = parseFloat(d.amount?.toString() || '0');
        const commission = parseFloat(d.commissionFee?.toString() || '0');
        // The initial amount is the original deposit BEFORE commission was deducted
        const initialAmount = amount + commission;
        
        console.log(`[Transaction mapping] Deposit ${d.id}: initial=${initialAmount}, commission=${commission}, total=${amount}`);
        
        return {
          id: `sepa-${d.id}`,
          type: 'deposit',
          amount: amount,
          currency: d.currency || 'EUR',
          status: d.status,
          createdAt: d.createdAt?.toISOString(),
          initialAmount: initialAmount, // This is the original amount BEFORE commission
          commissionAmount: commission,
          totalAmount: amount, // This is the amount AFTER commission deduction
          reference: d.reference || `DEP-${d.id}`
        };
      }),
      ...usdtTransactions.map(o => ({
        id: `usdt-${o.id}`,
        type: 'usdt',
        amount: parseFloat(o.amountUsd?.toString() || '0'),
        currency: 'USDT',
        status: o.status,
        createdAt: o.createdAt?.toISOString(),
        txHash: o.txHash,
        initialAmount: parseFloat(o.amountUsd?.toString() || '0'), // Fallback to amountUsd 
        commissionAmount: 0, // Default if not available
        totalAmount: parseFloat(o.amountUsd?.toString() || '0'),
        reference: `USDT-${o.id}` // Default reference
      })),
      ...usdcTransactions.map(o => ({
        id: `usdc-${o.id}`,
        type: 'usdc',
        amount: parseFloat(o.amountUsd?.toString() || '0'),
        currency: 'USDC',
        status: o.status,
        createdAt: o.createdAt?.toISOString(),
        txHash: o.txHash,
        initialAmount: parseFloat(o.amountUsd?.toString() || '0'), // Fallback to amountUsd
        commissionAmount: 0, // Default if not available
        totalAmount: parseFloat(o.amountUsd?.toString() || '0'),
        reference: `USDC-${o.id}` // Default reference
      }))
    ];

    // Sort by date
    transactions.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date();
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date();
      return dateB.getTime() - dateA.getTime();
    });

    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

// Get transactions for authenticated user
transactionsRouter.get('/api/transactions', async (req: any, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userId = req.user.id;
    console.log(`Fetching transactions for user ID: ${userId}`);

    const transactions = await getUserTransactions(userId);

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

// Get transactions for a specific client (admin/employee access)
transactionsRouter.get('/api/admin/client/:id/transactions', async (req: any, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Check if user is admin or employee
    if (!req.user?.isAdmin && !req.user?.isEmployee) {
      return res.status(403).json({ message: "Access denied" });
    }

    const clientId = parseInt(req.params.id);

    if (isNaN(clientId)) {
      return res.status(400).json({ message: "Invalid client ID" });
    }

    console.log(`Admin/employee fetching transactions for client ID: ${clientId}`);
    const transactions = await getUserTransactions(clientId);

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching client transactions:', error);
    res.status(500).json({ error: 'Failed to fetch client transactions' });
  }
});

// Add an admin-specific endpoint to get all transactions
transactionsRouter.get('/api/admin/transactions', async (req: any, res: Response) => {
  try {
    // Convert user object to have both snake_case and camelCase properties
    if (req.user) {
      req.user.isAdmin = req.user.isAdmin === true || req.user.is_admin === true;
      req.user.is_admin = req.user.isAdmin;
      req.user.isEmployee = req.user.isEmployee === true || req.user.is_employee === true;
      req.user.is_employee = req.user.isEmployee;
      req.user.userGroup = req.user.userGroup || req.user.user_group || '';
      req.user.user_group = req.user.userGroup;
    }

    console.log('Admin requesting all transactions - FULL DEBUG INFO:', {
      authStatus: req.isAuthenticated(),
      hasUser: !!req.user,
      userDetails: req.user ? {
        id: req.user.id,
        username: req.user.username,
        isAdmin: req.user.isAdmin,
        is_admin: req.user.is_admin,
        isEmployee: req.user.isEmployee,
        is_employee: req.user.is_employee,
        user_group: req.user.user_group,
        userGroup: req.user.userGroup,
        fullObject: JSON.stringify(req.user)
      } : 'No user'
    });

    // Re-enabled authentication checks
    if (!req.isAuthenticated()) {
      console.log('Authentication check failed - user not logged in');
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Check if user is admin using our normalized value
    if (!req.user.isAdmin) {
      console.log('Authorization check failed - user is not an admin', {
        user: req.user ? {
          id: req.user.id,
          username: req.user.username,
          isAdmin: req.user.isAdmin,
          is_admin: req.user.is_admin,
          userObject: JSON.stringify(req.user)
        } : 'No user'
      });
      return res.status(403).json({ message: "Access denied" });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    console.log('Fetching all transactions with pagination:', { page, limit, offset });

    // Get all transactions from all sources with proper error handling
    let sepaDepositsData: any[] = [];
    try {
      sepaDepositsData = await db.query.sepaDeposits.findMany({
        with: { 
          user: { 
            columns: { id: true, username: true, email: true } 
          } 
        },
        orderBy: [desc(sepaDeposits.createdAt)],
        limit,
        offset
      });
      console.log(`Retrieved ${sepaDepositsData.length} SEPA deposits`);
    } catch (error: any) {
      console.error('Error fetching SEPA deposits:', error.message);
      // Continue with empty array
    }

    let usdtOrdersData: any[] = [];
    try {
      usdtOrdersData = await db.query.usdtOrders.findMany({
        with: { 
          user: { 
            columns: { id: true, username: true, email: true } 
          } 
        },
        orderBy: [desc(usdtOrders.createdAt)],
        limit,
        offset
      });
      console.log(`Retrieved ${usdtOrdersData.length} USDT orders`);
    } catch (error: any) {
      console.error('Error fetching USDT orders:', error.message);
      // Continue with empty array
    }

    // Get USDC orders (with enhanced error handling)
    let usdcOrdersData: any[] = [];
    try {
      console.log('Attempting to query USDC orders...');

      usdcOrdersData = await db.query.usdcOrders.findMany({
        with: { 
          user: { 
            columns: { id: true, username: true, email: true } 
          } 
        },
        orderBy: [desc(usdcOrders.createdAt)],
        limit,
        offset
      });

      console.log(`Successfully retrieved ${usdcOrdersData.length} USDC transactions for admin dashboard`);
      // Log the first USDC transaction for debugging (if any exist)
      if (usdcOrdersData.length > 0) {
        console.log('Sample USDC transaction:', JSON.stringify(usdcOrdersData[0]));
      }
    } catch (error: any) {
      console.error('Error fetching USDC orders for admin:', error.message);
      // Add more detailed error logging
      if (error.cause) {
        console.error('Error cause:', error.cause);
      }
      if (error.stack) {
        console.error('Error stack:', error.stack);
      }
      // Continue with empty array
    }

    // Merge and format all transactions with safe handling of fields
    const allTransactions = [
      ...sepaDepositsData.map(d => {
        // Calculate the initial amount (pre-commission) by adding commission back to amount
        const amount = parseFloat(d.amount?.toString() || '0');
        const commission = parseFloat(d.commissionFee?.toString() || '0');
        // The initial amount is the original deposit BEFORE commission was deducted
        const initialAmount = amount + commission;
        
        console.log(`[Admin Transaction mapping] Deposit ${d.id}: initial=${initialAmount}, commission=${commission}, total=${amount}`);
        
        return {
          id: `sepa-${d.id}`,
          type: 'deposit',
          amount: amount,
          currency: d.currency || 'EUR',
          status: d.status,
          createdAt: d.createdAt?.toISOString(),
          initialAmount: initialAmount, // This is the original amount BEFORE commission
          commissionAmount: commission,
          totalAmount: amount, // This is the amount AFTER commission deduction
          reference: d.reference || `DEP-${d.id}`,
          user: {
            id: d.user?.id || d.userId,
            username: d.user?.username || 'Unknown',
            email: d.user?.email || ''
          }
        };
      }),
      ...usdtOrdersData.map(o => ({
        id: `usdt-${o.id}`,
        type: 'usdt',
        amount: parseFloat(o.amountUsd?.toString() || '0'),
        currency: 'USDT',
        status: o.status,
        createdAt: o.createdAt?.toISOString(),
        txHash: o.txHash,
        initialAmount: parseFloat(o.amountUsd?.toString() || '0'), // Fallback to amountUsd
        commissionAmount: 0, // Default if not available
        totalAmount: parseFloat(o.amountUsd?.toString() || '0'),
        reference: `USDT-${o.id}`, // Default reference
        user: {
          id: o.user?.id || o.userId,
          username: o.user?.username || 'Unknown',
          email: o.user?.email || ''
        }
      })),
      ...usdcOrdersData.map(o => {
        // Safe extraction of fields with fallbacks
        let id = o.id;
        let amountUsd = parseFloat((o.amountUsd || o.amount_usd || 0).toString());
        let status = o.status || 'pending';
        let createdAt = o.createdAt || o.created_at || new Date();
        let txHash = o.txHash || o.tx_hash || '';

        if (typeof createdAt === 'string') {
          createdAt = new Date(createdAt);
        }

        return {
          id: `usdc-${id}`,
          type: 'usdc',
          amount: amountUsd,
          currency: 'USDC',
          status: status,
          createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
          txHash: txHash,
          initialAmount: amountUsd, // Fallback to amountUsd
          commissionAmount: 0, // Default if not available
          totalAmount: amountUsd,
          reference: `USDC-${id}`, // Default reference
          user: {
            id: o.user?.id || o.userId,
            username: o.user?.username || 'Unknown',
            email: o.user?.email || ''
          }
        };
      })
    ];

    // Sort by date
    allTransactions.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date();
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date();
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`Returning ${allTransactions.length} total transactions to admin dashboard`);

    // Change: Return just the allTransactions array directly instead of wrapping it in an object
    // This matches what the client is expecting
    res.json(allTransactions);
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

// Add an endpoint for employee transactions similar to admin but with employee access control
transactionsRouter.get('/api/employee/transactions', async (req: any, res: Response) => {
  try {
    // Convert user object to have both snake_case and camelCase properties
    if (req.user) {
      req.user.isAdmin = req.user.isAdmin === true || req.user.is_admin === true;
      req.user.is_admin = req.user.isAdmin;
      req.user.isEmployee = req.user.isEmployee === true || req.user.is_employee === true;
      req.user.is_employee = req.user.isEmployee;
      req.user.userGroup = req.user.userGroup || req.user.user_group || '';
      req.user.user_group = req.user.userGroup;
    }
    
    console.log('Employee requesting transactions - FULL DEBUG INFO:', {
      authStatus: req.isAuthenticated(),
      hasUser: !!req.user,
      userDetails: req.user ? {
        id: req.user.id,
        username: req.user.username,
        isAdmin: req.user.isAdmin,
        is_admin: req.user.is_admin,
        isEmployee: req.user.isEmployee,
        is_employee: req.user.is_employee,
        user_group: req.user.user_group,
        userGroup: req.user.userGroup
      } : 'No user'
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Check if user is employee or admin using normalized values
    if (!req.user.isEmployee && !req.user.isAdmin) {
      console.log('Employee transactions - Authorization failed - not an employee or admin', {
        user: req.user ? {
          id: req.user.id,
          username: req.user.username,
          isAdmin: req.user.isAdmin,
          is_admin: req.user.is_admin,
          isEmployee: req.user.isEmployee,
          is_employee: req.user.is_employee
        } : 'No user'
      });
      return res.status(403).json({ message: "Access denied" });
    }

    // Get pagination parameters (optional)
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Use similar code as admin transactions but with possible restrictions
    // For now, we'll use the same implementation
    let sepaDepositsData = await db.query.sepaDeposits.findMany({
      with: { 
        user: { 
          columns: { id: true, username: true, email: true } 
        } 
      },
      orderBy: [desc(sepaDeposits.createdAt)],
      limit,
      offset
    });

    let usdtOrdersData = await db.query.usdtOrders.findMany({
      with: { 
        user: { 
          columns: { id: true, username: true, email: true } 
        } 
      },
      orderBy: [desc(usdtOrders.createdAt)],
      limit,
      offset
    });

    // USDC orders with error handling
    let usdcOrdersData: any[] = [];
    try {
      usdcOrdersData = await db.query.usdcOrders.findMany({
        with: { 
          user: { 
            columns: { id: true, username: true, email: true } 
          } 
        },
        orderBy: [desc(usdcOrders.createdAt)],
        limit,
        offset
      });
    } catch (error: any) {
      console.error('Error fetching USDC orders for employee:', error.message);
      // Continue with empty array
    }

    // Merge and format all transactions (similar to admin endpoint)
    const allTransactions = [
      ...sepaDepositsData.map(d => {
        // Calculate the initial amount (pre-commission) by adding commission back to amount
        const amount = parseFloat(d.amount?.toString() || '0');
        const commission = parseFloat(d.commissionFee?.toString() || '0');
        // The initial amount is the original deposit BEFORE commission was deducted
        const initialAmount = amount + commission;
        
        console.log(`[Employee Transaction mapping] Deposit ${d.id}: initial=${initialAmount}, commission=${commission}, total=${amount}`);
        
        return {
          id: `sepa-${d.id}`,
          type: 'deposit',
          amount: amount,
          currency: d.currency || 'EUR',
          status: d.status,
          createdAt: d.createdAt?.toISOString(),
          initialAmount: initialAmount, // This is the original amount BEFORE commission
          commissionAmount: commission,
          totalAmount: amount, // This is the amount AFTER commission deduction
          reference: d.reference || `DEP-${d.id}`,
          user: {
            id: d.user?.id || d.userId,
            username: d.user?.username || 'Unknown',
            email: d.user?.email || ''
          }
        };
      }),
      ...usdtOrdersData.map(o => ({
        id: `usdt-${o.id}`,
        type: 'usdt',
        amount: parseFloat(o.amountUsd?.toString() || '0'),
        currency: 'USDT',
        status: o.status,
        createdAt: o.createdAt?.toISOString(),
        txHash: o.txHash,
        initialAmount: parseFloat(o.amountUsd?.toString() || '0'),
        commissionAmount: 0,
        totalAmount: parseFloat(o.amountUsd?.toString() || '0'),
        reference: `USDT-${o.id}`,
        user: {
          id: o.user?.id || o.userId,
          username: o.user?.username || 'Unknown',
          email: o.user?.email || ''
        }
      })),
      ...usdcOrdersData.map(o => {
        // Safe extraction of fields with fallbacks
        let id = o.id;
        let amountUsd = parseFloat((o.amountUsd || o.amount_usd || 0).toString());
        let status = o.status || 'pending';
        let createdAt = o.createdAt || o.created_at || new Date();
        let txHash = o.txHash || o.tx_hash || '';

        if (typeof createdAt === 'string') {
          createdAt = new Date(createdAt);
        }

        return {
          id: `usdc-${id}`,
          type: 'usdc',
          amount: amountUsd,
          currency: 'USDC',
          status: status,
          createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
          txHash: txHash,
          initialAmount: amountUsd,
          commissionAmount: 0,
          totalAmount: amountUsd,
          reference: `USDC-${id}`,
          user: {
            id: o.user?.id || o.userId,
            username: o.user?.username || 'Unknown',
            email: o.user?.email || ''
          }
        };
      })
    ];

    // Sort by date
    allTransactions.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date();
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date();
      return dateB.getTime() - dateA.getTime();
    });

    res.json(allTransactions);
  } catch (error) {
    console.error('Error fetching employee transactions:', error);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

// DELETE endpoint for admin to delete transactions
transactionsRouter.delete('/api/admin/transactions/:type/:id', async (req: any, res: Response) => {
  try {
    // Convert user object to have both snake_case and camelCase properties
    if (req.user) {
      req.user.isAdmin = req.user.isAdmin === true || req.user.is_admin === true;
      req.user.is_admin = req.user.isAdmin;
      req.user.isEmployee = req.user.isEmployee === true || req.user.is_employee === true;
      req.user.is_employee = req.user.isEmployee;
      req.user.userGroup = req.user.userGroup || req.user.user_group || '';
      req.user.user_group = req.user.userGroup;
    }
    
    // Add detailed authentication debugging
    console.log('DELETE request authentication info:', {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      user: req.user ? {
        id: req.user.id,
        username: req.user.username,
        isAdmin: req.user.isAdmin
      } : 'No user object',
      cookies: req.cookies,
      session: req.session ? 'Session exists' : 'No session'
    });

    if (!req.isAuthenticated()) {
      console.log('DELETE transaction - Authentication failed');
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Check if user is admin using our normalized value
    if (!req.user.isAdmin) {
      console.log('DELETE transaction - Authorization failed - not an admin', {
        user: req.user ? {
          id: req.user.id,
          username: req.user.username,
          isAdmin: req.user.isAdmin,
          is_admin: req.user.is_admin,
          userObject: JSON.stringify(req.user)
        } : 'No user'
      });
      return res.status(403).json({ message: "Access denied" });
    }

    const { type, id } = req.params;
    const numericId = parseInt(id);

    if (isNaN(numericId) || numericId <= 0) {
      return res.status(400).json({ message: "Invalid transaction ID" });
    }

    console.log(`Attempting to delete ${type} transaction with ID: ${numericId}`);

    let result;

    switch (type.toLowerCase()) {
      case 'sepa':
        // Delete SEPA deposit
        result = await db
          .delete(sepaDeposits)
          .where(eq(sepaDeposits.id, numericId))
          .returning();
        break;

      case 'usdt':
        // Delete USDT order
        result = await db
          .delete(usdtOrders)
          .where(eq(usdtOrders.id, numericId))
          .returning();
        break;

      case 'usdc':
        // Delete USDC order
        result = await db
          .delete(usdcOrders)
          .where(eq(usdcOrders.id, numericId))
          .returning();
        break;

      default:
        return res.status(400).json({ message: "Invalid transaction type" });
    }

    if (!result || result.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    console.log(`Successfully deleted ${type} transaction with ID: ${numericId}`);
    res.json({ 
      message: "Transaction deleted successfully",
      transaction: {
        type: type.toLowerCase(),
        id: numericId
      }
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ message: "Failed to delete transaction" });
  }
});