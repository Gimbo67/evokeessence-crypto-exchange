import type { Express } from "express";
import { db } from "@db";
import { usdcOrders, users } from "@db/schema";
import { eq, and, lte } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middleware/admin";
import { telegramService } from "../services/telegram";

const purchaseSchema = z.object({
  amountUsd: z.number()
    .min(10, "Minimum amount is 10 USDC")
    .max(200000, "Maximum amount is 200,000 USDC"),
  usdcAddress: z.string().min(32, "Invalid USDC address").max(44, "Invalid USDC address")
});

export function registerUsdcRoutes(app: Express) {
  // Get user's USDC orders
  app.get("/api/usdc/orders", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      console.log('Fetching USDC orders for user:', req.user!.id);
      const orders = await db.query.usdcOrders.findMany({
        where: eq(usdcOrders.userId, req.user!.id),
        orderBy: (usdcOrders, { desc }) => [desc(usdcOrders.createdAt)],
      });
      res.json(orders);
    } catch (error) {
      console.error('Error fetching USDC orders:', error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Current USDC exchange rate
  app.get("/api/exchange/usdc-rate", async (req, res) => {
    try {
      // This would typically come from an external API
      // For now, we'll use a static rate
      const rate = 1.0002;
      res.json({
        rate,
        lastUpdate: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      res.status(500).json({ message: "Failed to fetch USDC rate" });
    }
  });

  // Purchase USDC
  app.post("/api/usdc/purchase", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      console.log('Purchase USDC request:', {
        userId: req.user!.id,
        body: req.body
      });

      const result = purchaseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid input",
          details: result.error.issues.map(i => i.message)
        });
      }

      const { amountUsd, usdcAddress } = result.data;
      let order;

      // Start a transaction to handle both order creation and balance update
      await db.transaction(async (tx) => {
        // Get current user with balance
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.id, req.user!.id))
          .limit(1);

        if (!user) {
          throw new Error("User not found");
        }

        const currentBalance = parseFloat(user.balance?.toString() || "0");

        // Validate balance
        if (currentBalance < amountUsd) {
          throw new Error("Insufficient balance");
        }

        // Calculate USDC amount with current exchange rate
        const exchangeRate = 1.0002; // This should come from your market rates
        const amountUsdc = amountUsd * exchangeRate;

        console.log('Processing USDC purchase:', {
          userId: req.user!.id,
          currentBalance,
          amountUsd,
          amountUsdc,
          exchangeRate
        });

        // Update user's balance
        await tx
          .update(users)
          .set({
            balance: (currentBalance - amountUsd).toString(),
            updated_at: new Date()
          })
          .where(eq(users.id, req.user!.id));

        // Create USDC order
        const [newOrder] = await tx
          .insert(usdcOrders)
          .values({
            userId: req.user!.id,
            amountUsd: amountUsd.toString(),
            amountUsdc: amountUsdc.toString(),
            exchangeRate: exchangeRate.toString(),
            usdcAddress,
            network: 'Solana',
            status: 'pending',
            createdAt: new Date(),
          })
          .returning();

        console.log('USDC order created:', newOrder);
        order = newOrder;

        // Send Telegram notifications asynchronously (non-blocking)
        setImmediate(async () => {
          try {
            console.log("🔔 [TELEGRAM] Sending notification for new USDC transaction:", newOrder.id);
            
            // Send to the new group bot system if user was referred
            if (user.referred_by) {
              console.log('🔔 [TELEGRAM] User has referral code, sending USDC to group bot:', user.referred_by);
              try {
                const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/telegram/internal/notify/transaction`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    userId: user.id,
                    type: 'USDC',
                    amount: amountUsd,
                    currency: 'USD',
                    status: 'pending',
                    reference: `ORDER-${newOrder.id}`
                  })
                });
                if (!response.ok) {
                  console.error('🔔 [TELEGRAM] Failed to send USDC group bot transaction notification:', await response.text());
                } else {
                  console.log('🔔 [TELEGRAM] USDC group bot transaction notification sent successfully');
                }
              } catch (groupBotError) {
                console.error('🔔 [TELEGRAM] USDC group bot transaction notification error:', groupBotError);
              }
            }
            
            // Also send to legacy telegram service
            const telegramMessage = telegramService.formatTransaction(
              'USDC',
              amountUsd,
              'USD',
              user.username,
              user.full_name || user.username,
              undefined, // No TX hash yet for processing orders
              `ORDER-${newOrder.id}`
            );
            
            await telegramService.sendTransactionNotification(telegramMessage);
            console.log("🔔 [TELEGRAM] USDC legacy service transaction notification sent successfully");
          } catch (telegramError) {
            console.error("🔔 [TELEGRAM] Error sending USDC transaction notifications:", telegramError);
          }
        });


      });

      return res.json(order);

    } catch (error) {
      console.error('Error processing USDC purchase:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to process USDC purchase";
      const statusCode = errorMessage === "Insufficient balance" ? 400 : 500;

      return res.status(statusCode).json({
        message: errorMessage
      });
    }
  });

  // Manual trigger for completing stuck USDC orders (internal use)
  app.post("/api/internal/usdc/complete-processing", async (req, res) => {
    try {
      console.log('[USDC Batch Complete] Starting batch completion of processing orders');
      
      // Find all USDC orders that are in pending status (ready for manual processing)
      const pendingOrders = await db.query.usdcOrders.findMany({
        where: eq(usdcOrders.status, 'pending'),
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              full_name: true,
              referred_by: true
            }
          }
        }
      });

      console.log(`[USDC Batch Complete] Found ${pendingOrders.length} pending orders to complete`);

      let completedCount = 0;
      let errorCount = 0;

      for (const order of pendingOrders) {
        try {
          const txHash = `${Date.now().toString(16)}-${Math.random().toString(16).substring(2, 10)}`;
          
          await db.transaction(async (tx) => {
            await tx
              .update(usdcOrders)
              .set({
                status: 'successful',
                completedAt: new Date(),
                txHash
              })
              .where(eq(usdcOrders.id, order.id));

            console.log(`[USDC Batch Complete] Completed order ${order.id} with tx hash: ${txHash}`);
          });

          // Send completion notifications
          try {
            const amountUsd = parseFloat(order.amountUsd?.toString() || '0');
            
            // Send to group bot system if user was referred
            if (order.user && 'referred_by' in order.user && order.user.referred_by) {
              try {
                const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/telegram/internal/notify/transaction`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    userId: 'id' in order.user ? order.user.id : order.userId,
                    type: 'USDC',
                    amount: amountUsd,
                    currency: 'USD',
                    status: 'successful',
                    reference: `ORDER-${order.id}`
                  })
                });
                if (response.ok) {
                  console.log(`🔔 [TELEGRAM] USDC completion group bot notification sent for order ${order.id}`);
                }
              } catch (groupBotError) {
                console.error(`🔔 [TELEGRAM] Group bot notification error for order ${order.id}:`, groupBotError);
              }
            }
            
            // Send to legacy telegram service
            const username = order.user && 'username' in order.user ? order.user.username : 'Unknown';
            const fullName = order.user && 'full_name' in order.user ? order.user.full_name : username;
            const completionMessage = telegramService.formatTransaction(
              'USDC',
              amountUsd,
              'USD',
              username,
              fullName || username,
              txHash,
              `ORDER-${order.id}`
            );
            
            await telegramService.sendTransactionNotification(completionMessage);
            console.log(`🔔 [TELEGRAM] USDC completion legacy notification sent for order ${order.id}`);
          } catch (notificationError) {
            console.error(`🔔 [TELEGRAM] Error sending completion notifications for order ${order.id}:`, notificationError);
          }

          completedCount++;
        } catch (orderError) {
          console.error(`[USDC Batch Complete] Error completing order ${order.id}:`, orderError);
          errorCount++;
        }
      }

      console.log(`[USDC Batch Complete] Completed ${completedCount} orders, ${errorCount} errors`);
      
      return res.json({
        success: true,
        processed: pendingOrders.length,
        completed: completedCount,
        errors: errorCount,
        message: `Successfully completed ${completedCount} USDC orders`
      });

    } catch (error) {
      console.error('[USDC Batch Complete] Error in batch completion:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to complete processing orders',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update USDC order status (client view)
  app.get("/api/usdc/orders/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const orderId = parseInt(req.params.id);

      // Get the order details with user info
      const [order] = await db.query.usdcOrders.findMany({
        where: eq(usdcOrders.id, orderId),
        with: {
          user: {
            columns: {
              id: true,
              username: true
            }
          }
        },
        limit: 1
      });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if the order belongs to the authenticated user
      if (order.userId !== req.user!.id && !req.user!.is_admin) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(order);
    } catch (error) {
      console.error('Error fetching USDC order:', error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Admin route to update USDC order status
  app.patch("/api/admin/usdc/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status, txHash: customTxHash } = req.body; // Extract custom txHash if provided

    console.log('Updating USDC order:', { 
      id, 
      status, 
      customTxHash: customTxHash ? '[CUSTOM HASH PROVIDED]' : 'not provided',
      timestamp: new Date().toISOString()
    });

    try {
      const orderId = parseInt(id);

      if (isNaN(orderId) || orderId <= 0) {
        return res.status(400).json({
          message: "Invalid order ID: Must be a positive number"
        });
      }

      // Validate status value
      const validStatuses = ['processing', 'successful', 'failed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid status: Must be 'processing', 'successful', or 'failed'"
        });
      }

      await db.transaction(async (tx) => {
        // Get current order
        const [order] = await tx
          .select()
          .from(usdcOrders)
          .where(eq(usdcOrders.id, orderId))
          .limit(1);

        if (!order) {
          throw new Error("Order not found");
        }

        const previousStatus = order.status;
        console.log(`USDC order current status: ${previousStatus}, changing to: ${status}`);

        // Generate a transaction hash for successful orders or use the provided one
        const txHash = status === 'successful'
          ? (customTxHash || `${Date.now().toString(16)}-${Math.random().toString(16).substring(2, 10)}`)
          : null;

        console.log(`Using transaction hash: ${txHash || 'none'} (${customTxHash ? 'custom' : 'generated'})`);

        // Update order status
        await tx
          .update(usdcOrders)
          .set({
            status,
            completedAt: status === 'successful' ? new Date() : null,
            txHash
          })
          .where(eq(usdcOrders.id, orderId));

        // Handle balance updates for status changes
        // We deduct the balance when order is created (purchase endpoint)
        // If status changes to 'failed', refund the user
        // If status changes to 'successful', no additional action needed
        if (status === 'failed' && previousStatus !== 'failed') {
          // Get user with current balance
          const [user] = await tx
            .select()
            .from(users)
            .where(eq(users.id, order.userId))
            .limit(1);

          if (!user) {
            throw new Error("User not found");
          }

          const currentBalance = parseFloat(user.balance?.toString() || '0');
          const orderAmount = parseFloat(order.amountUsdc?.toString() || '0');

          console.log('[USDC_BALANCE_UPDATE] Current state:', {
            userId: user.id,
            currentBalance,
            orderAmount,
            previousStatus,
            newStatus: status,
            timestamp: new Date().toISOString()
          });

          // When an order is marked as failed, refund the USD amount back to the user's balance
          // We use the original USD amount, not the USDC amount
          const refundAmount = parseFloat(order.amountUsd?.toString() || '0');
          const newBalance = currentBalance + refundAmount;

          console.log('[USDC_BALANCE_UPDATE] Updating user balance:', {
            userId: user.id,
            previousBalance: currentBalance,
            refundAmount,
            operation: 'add (refund)',
            newBalance,
            currency: user.balance_currency || 'USD'
          });

          // Update user's balance - adding the amount back
          await tx
            .update(users)
            .set({
              balance: newBalance.toString(),
              updated_at: new Date()
            })
            .where(eq(users.id, user.id));

          // Get updated balance for verification
          const [updatedUser] = await tx
            .select({
              id: users.id,
              balance: users.balance
            })
            .from(users)
            .where(eq(users.id, user.id))
            .limit(1);

          if (updatedUser) {
            console.log('[USDC_BALANCE_UPDATE] User balance updated:', {
              userId: updatedUser.id,
              newBalance: updatedUser.balance,
              timestamp: new Date().toISOString()
            });
          }
        }

        // Get updated order for response
        const [updatedOrder] = await tx
          .select()
          .from(usdcOrders)
          .where(eq(usdcOrders.id, orderId))
          .limit(1);

        // Send asynchronous Telegram notifications for USDC order status change (non-blocking)
        if (updatedOrder && status !== previousStatus) {
          // Get user information for the notification
          const user = await tx.query.users.findFirst({
            where: eq(users.id, order.userId)
          });
          
          if (user) {
            const amountUsd = parseFloat(updatedOrder.amountUsd || '0');
            
            // Send Telegram notifications asynchronously using setImmediate to prevent blocking
            setImmediate(() => {
              console.log(`[Telegram] Sending USDC order status change notification - Status changed from ${previousStatus} to ${status}`);
              
              // Send to group bot system if user has referral code
              if (user.referred_by) {
                console.log(`[Telegram] User has referral code: ${user.referred_by}, sending USDC status change to group bot`);
                setTimeout(async () => {
                  try {
                    const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/telegram/internal/notify/transaction`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        userId: user.id,
                        type: 'USDC',
                        amount: amountUsd,
                        currency: 'USD',
                        status: status,
                        reference: `ORDER-${updatedOrder.id}`
                      })
                    });
                    if (!response.ok) {
                      console.error('[Telegram] Failed to send USDC group bot status change notification:', await response.text());
                    } else {
                      console.log('[Telegram] USDC group bot status change notification sent successfully');
                    }
                  } catch (groupBotError) {
                    console.error('[Telegram] USDC group bot status change notification error:', groupBotError);
                  }
                }, 100);
              }
              
              // Also send to legacy telegram service for status changes (async)
              setTimeout(async () => {
                try {
                  const message = telegramService.formatTransaction(
                    'USDC',
                    amountUsd,
                    'USD',
                    user.username,
                    user.full_name || user.username,
                    updatedOrder.txHash ?? undefined,
                    `ORDER-${updatedOrder.id}`
                  );
                  await telegramService.sendTransactionNotification(message);
                  console.log('[Telegram] USDC legacy service status change notification sent successfully');
                } catch (legacyError) {
                  console.error('[Telegram] USDC legacy service status change notification error:', legacyError);
                }
              }, 200);
            });
          }
        }

        res.json(updatedOrder);
      });
    } catch (error) {
      console.error('Error updating USDC order:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to update order status",
        details: error instanceof Error ? error.message : undefined
      });
    }
  });

  // Admin endpoint to get all USDC orders
  app.get("/api/admin/usdc", requireAdmin, async (req, res) => {
    try {
      console.log('Admin fetching all USDC orders');

      const orders = await db.query.usdcOrders.findMany({
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: (usdcOrders, { desc }) => [desc(usdcOrders.createdAt)]
      });

      res.json(orders);
    } catch (error) {
      console.error('Error fetching all USDC orders:', error);
      res.status(500).json({ message: "Failed to fetch USDC orders" });
    }
  });
}