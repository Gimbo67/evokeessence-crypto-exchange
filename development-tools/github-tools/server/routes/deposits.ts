import express, { Response, Request } from 'express';
import { db } from "@db";
import { sepaDeposits } from "@db/schema";
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { requireAuthentication } from '../middleware/auth';

export const depositsRouter = express.Router();

// Bank details for the platform
const BANK_DETAILS = {
  name: "Goldman Financial Services GmbH",
  iban: "DE89 3704 0044 0532 0130 00",
  bic: "COBADEFFXXX",
  address: "Kaiserstraße 10, 60311 Frankfurt am Main, Germany"
};

// Create a new SEPA deposit
depositsRouter.post('/deposits', requireAuthentication, async (req: Request, res: Response) => {
  try {
    console.log("Received deposit request:", req.body);
    const { amount, currency = "EUR" } = req.body;

    // Get user ID from session
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // Calculate commission (16%)
    const commission = parsedAmount * 0.16;
    const finalAmount = parsedAmount - commission;

    console.log("Deposit amount:", parsedAmount, "Commission:", commission, "Final amount:", finalAmount);

    // Generate unique reference code (combination of user ID and random string)
    const reference = `REF-${userId}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Insert deposit record into database
    const deposit = await db.insert(sepaDeposits).values({
      userId: req.user!.id,
      amount: parsedAmount,
      currency,
      commissionFee: commission,
      reference,
      status: "pending",
      created_at: new Date()
    }).returning();

    console.log("Created deposit:", deposit);

    // Ensure we have a valid deposit object with an ID
    if (!deposit || !deposit[0] || !deposit[0].id) {
      console.error("Failed to create deposit, invalid response:", deposit);
      return res.status(500).json({ message: "Failed to create deposit" });
    }

    // Return deposit with bank details
    const responseData = {
      depositId: deposit[0].id,
      reference: deposit[0].reference,
      bankDetails: BANK_DETAILS, // Use the platform's bank details for consistency.
      amount: {
        original: parseFloat(deposit[0].amount),
        commission: parseFloat(deposit[0].commissionFee), // Corrected: Use commissionFee
        final: parseFloat(deposit[0].amount) - parseFloat(deposit[0].commissionFee), //Corrected: Calculate final amount
        currency: deposit[0].currency
      },
      status: deposit[0].status,
      created_at: deposit[0].created_at?.toISOString()
    };

    console.log("Sending deposit response:", responseData);
    res.status(201).json(responseData); //Corrected: Use 201 status code for creation
  } catch (error) {
    console.error("Error creating deposit:", error);
    res.status(500).json({ message: "Failed to create deposit" });
  }
});

// Get single deposit by ID
depositsRouter.get('/deposits/:id', requireAuthentication, async (req: Request, res: Response) => {
  try {
    const depositId = parseInt(req.params.id);
    if (isNaN(depositId)) {
      return res.status(400).json({ message: "Invalid deposit ID" });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const deposit = await db.query.sepaDeposits.findFirst({
      where: eq(sepaDeposits.id, depositId)
    });

    if (!deposit) {
      return res.status(404).json({ message: "Deposit not found" });
    }

    // Check if the deposit belongs to the user
    if (deposit.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized access to deposit" });
    }

    return res.json({
      depositId: deposit.id,
      reference: deposit.reference,
      bankDetails: BANK_DETAILS,
      amount: {
        original: deposit.amount,
        commission: deposit.commissionFee, // Corrected: Use commissionFee
        final: deposit.amount - deposit.commissionFee, //Corrected: Calculate final amount
        currency: deposit.currency
      },
      status: deposit.status,
      created_at: deposit.created_at
    });
  } catch (error) {
    console.error("Error fetching deposit:", error);
    res.status(500).json({ message: "Failed to fetch deposit" });
  }
});

// Get all deposits for the authenticated user
depositsRouter.get('/deposits', requireAuthentication, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const deposits = await db.query.sepaDeposits.findMany({
      where: eq(sepaDeposits.userId, userId),
      orderBy: (sepaDeposits, { desc }) => [desc(sepaDeposits.created_at)]
    });

    return res.json(deposits.map(deposit => ({
      id: deposit.id,
      amount: deposit.amount,
      currency: deposit.currency,
      finalAmount: deposit.finalAmount,
      status: deposit.status,
      reference: deposit.reference,
      created_at: deposit.created_at
    })));
  } catch (error) {
    console.error("Error fetching deposits:", error);
    res.status(500).json({ message: "Failed to fetch deposits" });
  }
});