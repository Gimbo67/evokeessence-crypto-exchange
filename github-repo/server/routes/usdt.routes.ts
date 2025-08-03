import type { Express } from "express";
import { db } from "@db";
import { usdtOrders, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middleware/admin";

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