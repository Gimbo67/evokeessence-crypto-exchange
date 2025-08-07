import type { Express } from "express";
import { db } from "@db";
import { usdtOrders, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middleware/admin";
import { telegramService } from "../services/telegram";

const purchaseSchema = z.object({
  amountUsd: z.number().positive(),
  usdtAddress: z.string().min(1)
});

export function registerUsdtRoutes(app: Express) {
  // Get user's USDT orders
  app.get("/api/usdt/orders", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const orders = await db.query.usdtOrders.findMany({
        where: eq(usdtOrders.userId, req.user!.id),
        orderBy: (usdtOrders, { desc }) => [desc(usdtOrders.createdAt)],
      });
      res.json(orders);
    } catch (error) {
      console.error('Error fetching USDT orders:', error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Purchase USDT
  app.post("/api/usdt/purchase", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const result = purchaseSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid input",
          details: result.error.issues.map(i => i.message)
        });
      }

      const { amountUsd, usdtAddress } = result.data;

      // Get current user with balance
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const currentBalance = parseFloat(user.balance?.toString() || "0");

      // Validate balance
      if (currentBalance < amountUsd) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Calculate USDT amount with current exchange rate
      const exchangeRate = 1.0002; // This should come from your market rates
      const amountUsdt = amountUsd * exchangeRate;

      // Create USDT order - Balance will be deducted when admin marks it as successful
      const [order] = await db
        .insert(usdtOrders)
        .values({
          userId: req.user!.id,
          amountUsd: amountUsd.toString(),
          amountUsdt: amountUsdt.toString(),
          exchangeRate: exchangeRate.toString(),
          usdtAddress,
          network: 'TRC20',
          status: 'processing',
          createdAt: new Date(),
        })
        .returning();

      // Send Telegram notification for the new USDT transaction
      try {
        console.log("Sending Telegram notification for new USDT transaction:", order.id);
        
        const telegramMessage = telegramService.formatTransaction(
          'USDT',
          amountUsd,
          'USD',
          user.username,
          user.full_name || user.username,
          undefined, // No TX hash yet for processing orders
          `ORDER-${order.id}`
        );
        
        await telegramService.sendTransactionNotification(telegramMessage);
        console.log("Telegram USDT transaction notification sent successfully");
      } catch (telegramError) {
        console.error("Error sending Telegram USDT transaction notification:", telegramError);
        // Don't fail the order creation if Telegram fails, just log the error
      }

      res.json(order);
    } catch (error) {
      console.error('Error processing USDT purchase:', error);
      res.status(500).json({ 
        message: "Failed to process USDT purchase",
        details: error instanceof Error ? error.message : undefined
      });
    }
  });

  // Admin route to update USDT order status
  app.patch("/api/admin/usdt/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    console.log('Updating USDT order:', { id, status });

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
          .from(usdtOrders)
          .where(eq(usdtOrders.id, orderId))
          .limit(1);

        if (!order) {
          throw new Error("Order not found");
        }

        const previousStatus = order.status;

        // Update order status
        await tx
          .update(usdtOrders)
          .set({
            status,
            completedAt: status === 'successful' ? new Date() : null,
            txHash: status === 'successful' ? `TX_${Date.now()}` : null, // Simulated TX hash
          })
          .where(eq(usdtOrders.id, orderId));

        // Only deduct balance when marking as successful for the first time
        if (status === 'successful' && previousStatus !== 'successful') {
          // Get user with current balance
          const [user] = await tx
            .select()
            .from(users)
            .where(eq(users.id, order.userId))
            .limit(1);

          if (!user) {
            throw new Error("User not found");
          }

          // Calculate new balance
          const currentBalance = parseFloat(user.balance?.toString() || '0');
          const orderAmount = parseFloat(order.amountUsd?.toString() || '0');
          const newBalance = currentBalance - orderAmount;

          // Update user's balance
          await tx
            .update(users)
            .set({
              balance: newBalance.toFixed(2),
              updatedAt: new Date()
            })
            .where(eq(users.id, user.id));

          console.log('User balance updated for USDT order:', {
            userId: user.id,
            orderId,
            previousBalance: currentBalance,
            orderAmount,
            newBalance,
            action: 'deduct'
          });
        }

        // Get updated order for response
        const [updatedOrder] = await tx
          .select()
          .from(usdtOrders)
          .where(eq(usdtOrders.id, orderId))
          .limit(1);

        console.log('USDT order updated:', {
          orderId,
          status,
          updatedOrder
        });

        // Send Telegram notifications for USDT order status change
        if (updatedOrder && status !== previousStatus) {
          try {
            console.log(`[Telegram] Sending USDT order status change notification - Status changed from ${previousStatus} to ${status}`);
            
            // Get user information for the notification
            const user = await tx.query.users.findFirst({
              where: eq(users.id, order.userId)
            });
            
            if (user) {
              const amountUsd = parseFloat(updatedOrder.amountUsd || '0');
              
              // Send to group bot system if user has referral code
              if (user.referred_by) {
                console.log(`[Telegram] User has referral code: ${user.referred_by}, sending USDT status change to group bot`);
                try {
                  const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/telegram/internal/notify/transaction`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      userId: user.id,
                      type: 'USDT',
                      amount: amountUsd,
                      currency: 'USD',
                      status: status,
                      reference: `ORDER-${updatedOrder.id}`
                    })
                  });
                  if (!response.ok) {
                    console.error('[Telegram] Failed to send USDT group bot status change notification:', await response.text());
                  } else {
                    console.log('[Telegram] USDT group bot status change notification sent successfully');
                  }
                } catch (groupBotError) {
                  console.error('[Telegram] USDT group bot status change notification error:', groupBotError);
                }
              }
              
              // Also send to legacy telegram service for status changes
              try {
                const message = telegramService.formatTransaction(
                  'USDT',
                  amountUsd,
                  'USD',
                  user.username,
                  user.full_name || user.username,
                  updatedOrder.txHash || undefined,
                  `ORDER-${updatedOrder.id}`
                );
                await telegramService.sendTransactionNotification(message);
                console.log('[Telegram] USDT legacy service status change notification sent successfully');
              } catch (legacyError) {
                console.error('[Telegram] USDT legacy service status change notification error:', legacyError);
              }
            }
          } catch (telegramError) {
            console.error('[Telegram] Error sending USDT order status change notifications:', telegramError);
            // Continue with the response even if Telegram fails
          }
        }

        res.json(updatedOrder);
      });
    } catch (error) {
      console.error('Error updating USDT order:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to update order status",
        details: error instanceof Error ? error.message : undefined
      });
    }
  });
}