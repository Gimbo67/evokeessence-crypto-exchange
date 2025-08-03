import type { Express } from "express";
import { db } from "@db";
import { sepaDeposits, users } from "@db/schema";
import { eq, desc, sql, asc, and, ne } from "drizzle-orm";
import { format } from "date-fns";
import { requireAdmin } from "../middleware/admin";
import { z } from "zod";
import axios from "axios";
import { getExchangeRates, convertCurrency } from "../services/exchange-rates";
import webSocketService from "../services/websocket";
import { telegramService } from "../services/telegram";

/**
 * Currency conversion and deposit handling utility functions
 */

// Currency types
type Currency = 'EUR' | 'USD' | 'CHF' | 'GBP';

// Constants for commission
const COMMISSION_RATE = 0.10; // 10%
const CONTRACTOR_COMMISSION_RATE = 0.85; // 0.85% (stored as percentage value, not decimal)

/**
 * Validates if a currency pair is supported
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @returns boolean - True if the currency pair is supported
 */
const validateCurrencyPair = (fromCurrency: Currency, toCurrency: Currency): boolean => {
  const supportedCurrencies: Currency[] = ['EUR', 'USD', 'CHF', 'GBP'];
  return supportedCurrencies.includes(fromCurrency) && supportedCurrencies.includes(toCurrency);
};

/**
 * Function to get user's preferred currency and balance
 * @param tx - Drizzle-ORM transaction object
 * @param userId - ID of the user
 * @returns Promise<{ balance: number; currency: Currency }> - User's balance and preferred currency
 */
const getUserCurrencyPreference = async (
  tx: any,
  userId: number
): Promise<{ balance: number; currency: Currency }> => {
  console.log('[USER_CURRENCY] Getting user currency preference for user ID:', userId);

  const [user] = await tx
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error('User not found');
  }

  const balance = parseFloat(user.balance?.toString() || '0');
  const currency = (user.balance_currency || 'USD') as Currency;

  console.log('[USER_CURRENCY] User currency preference:', { userId, balance, currency });

  return { balance, currency };
};

/**
 * Enhanced balance update function with proper currency handling
 * using the improved exchange rates service
 * @param tx - Drizzle-ORM transaction object
 * @param userId - ID of the user
 * @param amount - Amount to add or subtract
 * @param currency - Currency of the amount
 * @param operation - 'add' or 'subtract'
 * @returns Promise<void>
 */
const updateUserBalance = async (
  tx: any,
  userId: number,
  amount: number,
  currency: Currency,
  operation: 'add' | 'subtract'
): Promise<void> => {
  try {
    console.log('[BALANCE_UPDATE] Starting balance update:', {
      userId,
      amount: `${amount} ${currency}`,
      operation,
      timestamp: new Date().toISOString()
    });

    // Get user's current balance and currency preference
    const { balance: currentBalance, currency: userCurrency } = await getUserCurrencyPreference(tx, userId);

    // Validate currencies
    if (!validateCurrencyPair(currency, userCurrency)) {
      throw new Error(`Unsupported currency pair: ${currency}/${userCurrency}`);
    }

    // Convert amount to user's preferred currency if needed
    let amountInUserCurrency = amount;

    if (currency !== userCurrency) {
      console.log(`[BALANCE_UPDATE] Converting ${amount} ${currency} to ${userCurrency} for balance update`);
      amountInUserCurrency = await convertCurrency(amount, currency, userCurrency);
    }

    // Calculate new balance
    const balanceChange = operation === 'add' ? amountInUserCurrency : -amountInUserCurrency;
    const newBalance = Number((currentBalance + balanceChange).toFixed(2));

    console.log('[BALANCE_UPDATE] Detailed calculation:', {
      userId,
      currentBalance: `${currentBalance} ${userCurrency}`,
      operation,
      amount: `${amount} ${currency}`,
      convertedAmount: `${amountInUserCurrency} ${userCurrency}`,
      balanceChange: `${balanceChange} ${userCurrency}`,
      newBalance: `${newBalance} ${userCurrency}`
    });

    // Update user's balance
    await tx
      .update(users)
      .set({
        balance: newBalance.toString(),
        balance_currency: userCurrency,
        updated_at: new Date()
      })
      .where(eq(users.id, userId));

    console.log('[BALANCE_UPDATE] User balance updated successfully');

    // Log the user's updated balance for verification
    const [updatedUser] = await tx
      .select({
        id: users.id,
        balance: users.balance,
        balanceCurrency: users.balance_currency
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (updatedUser) {
      console.log('[BALANCE_UPDATE] Verification - User balance after update:', {
        userId: updatedUser.id,
        newBalance: updatedUser.balance,
        currency: updatedUser.balanceCurrency
      });
      
      // Send WebSocket notification for balance update
      try {
        const balanceNum = parseFloat(updatedUser.balance?.toString() || '0');
        const currencyStr = (updatedUser.balanceCurrency || 'USD') as string;
        
        console.log(`[WebSocket] Sending balanceUpdated event to user ${userId}`);
        
        webSocketService.sendToUser(userId, {
          type: 'balanceUpdated',
          userId: userId,
          data: {
            currency: currencyStr,
            balance: balanceNum,
            previous: currentBalance,
            updatedAt: new Date().toISOString()
          }
        });
      } catch (wsError) {
        console.error('[WebSocket] Error sending balance update notification:', wsError);
        // Continue execution even if WebSocket fails
      }
    }
  } catch (error) {
    console.error('[BALANCE_UPDATE] Error updating user balance:', error);
    throw new Error(`Failed to update user balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Function to calculate deposit amounts with commission
 * @param originalAmount - Original deposit amount
 * @param fromCurrency - Currency of the original amount
 * @param toCurrency - Target currency (defaults to USD)
 * @returns Promise<{ originalAmount: number; commissionAmount: number; amountAfterCommission: number; exchangeRate: number; convertedAmount: number; }> - Deposit details after commission calculation and currency conversion
 */
const calculateDepositAmounts = async (
  originalAmount: number,
  fromCurrency: Currency,
  toCurrency: Currency = 'USD',
  referralCode?: string,
  directContractorId?: number
): Promise<{
  originalAmount: number;
  commissionAmount: number;
  amountAfterCommission: number;
  exchangeRate: number;
  convertedAmount: number;
  contractorCommission?: number;
  contractorId?: number;
  referralCode?: string;
}> => {
  try {
    console.log(`[DEPOSIT_CALC] Calculating deposit: ${originalAmount} ${fromCurrency} to ${toCurrency}`);

    // Verify supported currencies
    if (!validateCurrencyPair(fromCurrency, toCurrency)) {
      throw new Error(`Unsupported currency pair: ${fromCurrency}/${toCurrency}`);
    }

    // Check if referral code exists or if a contractorId is directly provided
    let contractorId: number | undefined = directContractorId;
    let contractorCommission: number | undefined;
    let contractor = null;
    
    // Special case for code A64S (andreavass) - always check for andreavass
    if (referralCode === 'A64S') {
      console.log(`[DEPOSIT_CALC] Special referral code A64S detected - looking up andreavass`);
      contractor = await db.query.users.findFirst({
        where: eq(users.username, 'andreavass')
      });
      
      if (contractor && contractor.is_contractor) {
        contractorId = contractor.id;
        console.log(`[DEPOSIT_CALC] Found andreavass with ID: ${contractorId}`);
      } else {
        console.error(`[DEPOSIT_CALC] Critical error: andreavass not found or not a contractor`);
      }
    }
    // If a direct contractor ID was provided, get the contractor details
    else if (directContractorId) {
      console.log(`[DEPOSIT_CALC] Using provided contractor ID: ${directContractorId}`);
      contractor = await db.query.users.findFirst({
        where: eq(users.id, directContractorId)
      });
      
      if (!contractor || !contractor.is_contractor) {
        console.log(`[DEPOSIT_CALC] Provided contractor ID ${directContractorId} is not valid`);
        contractorId = undefined;
      }
    }
    // If a referral code was provided but we still don't have a contractor, look it up
    else if (referralCode && !contractor) {
      console.log(`[DEPOSIT_CALC] Looking up referral code: ${referralCode}`);
      
      // Check if this is a Telegram group referral code
      if (referralCode.startsWith('TG-GRP-')) {
        console.log(`[DEPOSIT_CALC] Telegram group referral detected: ${referralCode}`);
        // For Telegram group referrals, we don't assign a contractor but still track the referral
        contractorId = undefined;
        contractorCommission = undefined;
      } else {
        // Look up individual contractor referral
        contractor = await db.query.users.findFirst({
          where: eq(users.referral_code, referralCode)
        });
        
        if (contractor && contractor.is_contractor) {
          contractorId = contractor.id;
          console.log(`[DEPOSIT_CALC] Valid contractor referral: ${contractor.username} (ID: ${contractor.id})`);
        } else {
          console.log(`[DEPOSIT_CALC] Invalid referral code or user is not a contractor: ${referralCode}`);
          contractorId = undefined;
        }
      }
    }
    
    // Calculate contractor commission if we have a valid contractor
    if (contractor && contractor.is_contractor && contractorId) {
      // Get contractor rate from the database (stored as 0.85 for 0.85%)
      // Need to divide by 100 since the rate is stored as percentage value in database
      const contractorRate = parseFloat(contractor.contractor_commission_rate?.toString() || CONTRACTOR_COMMISSION_RATE.toString()) / 100;
      contractorCommission = Number((originalAmount * contractorRate).toFixed(2));
      console.log(`[DEPOSIT_CALC] Calculated contractor commission: ${contractorCommission} (rate: ${contractorRate})`);
    }

    // Calculate platform commission first
    const commissionAmount = Number((originalAmount * COMMISSION_RATE).toFixed(2));
    const amountAfterCommission = Number((originalAmount - commissionAmount).toFixed(2));
    
    console.log(`[DEPOSIT_CALC] Amount after commission: ${amountAfterCommission} ${fromCurrency}`);

    // Get exchange rate from our enhanced service
    let exchangeRate = 1;
    if (fromCurrency !== toCurrency) {
      try {
        // Convert 1 unit to get the exchange rate
        exchangeRate = await convertCurrency(1, fromCurrency, toCurrency);
        console.log(`[DEPOSIT_CALC] Current exchange rate ${fromCurrency}/${toCurrency}:`, exchangeRate);
      } catch (conversionError) {
        console.error(`[DEPOSIT_CALC] Error getting exchange rate: ${conversionError}`);
        // Use fallback if exchange rate retrieval fails
        exchangeRate = 1;
        if (fromCurrency === 'EUR' && toCurrency === 'USD') exchangeRate = 1.08;
        if (fromCurrency === 'USD' && toCurrency === 'EUR') exchangeRate = 0.93;
        if (fromCurrency === 'GBP' && toCurrency === 'USD') exchangeRate = 1.27;
        if (fromCurrency === 'USD' && toCurrency === 'GBP') exchangeRate = 0.79;
        if (fromCurrency === 'CHF' && toCurrency === 'USD') exchangeRate = 1.10;
        if (fromCurrency === 'USD' && toCurrency === 'CHF') exchangeRate = 0.91;
        console.log(`[DEPOSIT_CALC] Using fallback exchange rate: ${exchangeRate}`);
      }
    }

    // Convert to target currency - apply exchange rate AFTER commission is deducted
    const convertedAmount = Number((amountAfterCommission * exchangeRate).toFixed(2));

    console.log('[DEPOSIT_CALC] Deposit calculation details:', {
      originalAmount,
      commissionRate: COMMISSION_RATE,
      commissionAmount,
      amountAfterCommission,
      exchangeRate,
      convertedAmount,
      fromCurrency,
      toCurrency
    });

    return {
      originalAmount,
      commissionAmount,
      amountAfterCommission,
      exchangeRate,
      convertedAmount,
      contractorCommission,
      contractorId,
      referralCode
    };
  } catch (error) {
    console.error('[DEPOSIT_CALC] Error calculating deposit amounts:', error);
    throw error;
  }
};

/**
 * Validate deposit input.
 * @param amount - Amount to validate
 * @param currency - Currency to validate
 * @throws {Error} If amount or currency is invalid.
 */
const validateDepositInput = (amount: number, currency: Currency): void => {
    if (amount < 0) {
        throw new Error("Amount cannot be negative");
    }
    if (!Number.isFinite(amount)) {
        throw new Error("Invalid amount");
    }
    if (!validateCurrencyPair(currency, 'USD')) { // Assuming USD is the target currency
        throw new Error(`Unsupported currency pair: ${currency}/USD`);
    }
};

/**
 * @param {Express} app - Express application instance
 */
export function registerDepositRoutes(app: Express) {
  // Add request logging specifically for deposit routes
  app.use('/api/deposits', (req, res, next) => {
    console.log(`[DEPOSIT_REQUEST] ${req.method} /api/deposits - Session ID: ${req.sessionID}, Auth: ${req.isAuthenticated()}, User: ${req.user?.id || 'none'}`);
    next();
  });

  // Authentication middleware - apply to specific routes that need it
  const requireAuth = (req: any, res: any, next: any) => {
    console.log('[REQUIRE_AUTH] Checking authentication:', {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      sessionId: req.sessionID,
      userId: req.user?.id
    });
    
    if (!req.isAuthenticated() || !req.user) {
      console.log('[REQUIRE_AUTH] Authentication failed');
      return res.status(401).json({ 
        message: "Not authenticated",
        code: 'AUTH_ERROR' 
      });
    }
    
    console.log('[REQUIRE_AUTH] Authentication successful for user:', req.user.id);
    next();
  };

  // Update the deposit list endpoint to support all currency conversions
  app.get("/api/deposits", requireAuth, async (req, res) => {
    try {
      // Additional safety check after auth middleware
      if (!req.user || !req.user.id) {
        console.log('[API_DEPOSITS] User object missing after auth middleware:', req.user);
        return res.status(401).json({ message: "User authentication failed", code: 'AUTH_ERROR' });
      }
      
      console.log('[API_DEPOSITS] Fetching deposits for user:', req.user.id);
      const userDeposits = await db.query.sepaDeposits.findMany({
        where: eq(sepaDeposits.userId, req.user.id),
        orderBy: desc(sepaDeposits.createdAt),
      });

      // Get user's preferred currency
      const { currency: userCurrency } = await getUserCurrencyPreference(db, req.user!.id);

      // Convert all amounts to user's preferred currency and major currencies
      const depositsWithConversions = await Promise.all(
        userDeposits.map(async (deposit) => {
          const amount = parseFloat(deposit.amount || '0');
          const currency = (deposit.currency || 'EUR') as Currency;

          // Convert to all major currencies
          const [eurAmount, usdAmount, chfAmount, gbpAmount] = await Promise.all([
            currency === 'EUR' ? amount : convertCurrency(amount, currency, 'EUR'),
            currency === 'USD' ? amount : convertCurrency(amount, currency, 'USD'),
            currency === 'CHF' ? amount : convertCurrency(amount, currency, 'CHF'),
            currency === 'GBP' ? amount : convertCurrency(amount, currency, 'GBP')
          ]);

          // Convert to user's preferred currency if different
          const userPreferredAmount = userCurrency === currency
            ? amount
            : await convertCurrency(amount, currency, userCurrency);

          return {
            ...deposit,
            originalAmount: {
              amount,
              currency
            },
            conversions: {
              eur: eurAmount,
              usd: usdAmount,
              chf: chfAmount,
              gbp: gbpAmount,
              [userCurrency.toLowerCase()]: userPreferredAmount
            },
            userCurrency: {
              amount: userPreferredAmount,
              currency: userCurrency
            }
          };
        })
      );

      res.json(depositsWithConversions);
    } catch (error) {
      console.error('[API_DEPOSITS] Error fetching deposits:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch deposits",
        code: 'FETCH_ERROR'
      });
    }
  });

  // Update the client deposit creation endpoint - SIMPLIFIED TO FIX HANGING ISSUE
  app.post("/api/deposits", requireAuth, async (req, res) => {
    try {
      console.log('[API_DEPOSIT_CREATE] Starting deposit creation. Auth info:', { 
        isAuthenticated: req.isAuthenticated(),
        userId: req.user?.id,
        username: req.user?.username 
      });
      console.log('[API_DEPOSIT_CREATE] Request body:', req.body);

      const result = depositSchema.safeParse(req.body);
      if (!result.success) {
        console.log('[API_DEPOSIT_CREATE] Validation error:', result.error.errors);
        return res.status(400).json({
          message: result.error.errors[0].message
        });
      }

      const { amount, currency, referralCode } = result.data;
      console.log(`[API_DEPOSIT_CREATE] Parsed deposit: ${amount} ${currency}, Referral code: ${referralCode || 'None'}`);

      // Authentication already handled by requireAuth middleware
      console.log('[API_DEPOSIT_CREATE] User authenticated via requireAuth middleware:', {
        userId: req.user?.id,
        username: req.user?.username
      });

      await db.transaction(async (tx) => {
        // Simple commission calculation without complex currency conversion
        const commission = amount * COMMISSION_RATE; // 10%
        const amountAfterCommission = amount - commission;
        
        console.log(`[API_DEPOSIT_CREATE] Simple calculation: Amount ${amount}, Commission ${commission}, Final ${amountAfterCommission}`);

        // Get user referral info
        const [userInfo] = await tx
          .select({ 
            referred_by: users.referred_by,
            contractor_id: users.contractor_id 
          })
          .from(users)
          .where(eq(users.id, req.user!.id))
          .limit(1);

        // Generate unique reference number
        const uniqueId = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
        const reference = `PAY-${req.user!.id}-${uniqueId}`;

        console.log(`[API_DEPOSIT_CREATE] Generated reference: ${reference}`);

        const [deposit] = await tx
          .insert(sepaDeposits)
          .values({
            userId: req.user!.id,
            amount: amountAfterCommission.toString(),
            currency: currency || 'EUR',
            reference,
            status: "pending",
            commissionFee: commission.toString(),
            referralCode: userInfo?.referred_by || referralCode,
            contractorId: userInfo?.contractor_id,
            createdAt: new Date(),
          })
          .returning();

        console.log('[API_DEPOSIT_CREATE] Deposit created successfully:', {
          id: deposit.id,
          userId: deposit.userId,
          amount: deposit.amount,
          currency: deposit.currency,
          status: deposit.status
        });

        // Send Telegram notifications IMMEDIATELY after response (ultra-fast async)
        process.nextTick(async () => {
          try {
            // Get user for notifications - fast query
            const notificationUser = await db.query.users.findFirst({
              where: eq(users.id, req.user!.id),
              columns: {
                id: true,
                username: true,
                full_name: true,
                referred_by: true
              }
            });

            if (notificationUser) {
              // Group bot notification (non-blocking with immediate timeout)
              if (notificationUser.referred_by) {
                setTimeout(() => {
                  fetch(`http://localhost:${process.env.PORT || 5000}/api/telegram/internal/notify/transaction`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                      userId: notificationUser.id,
                      type: 'SEPA',
                      amount: amountAfterCommission,
                      currency: currency || 'EUR',
                      status: 'pending',
                      reference: reference,
                      initialAmount: amount,
                      commission: commission
                    }),
                    signal: AbortSignal.timeout(2000) // 2 second timeout
                  }).catch(err => console.error('Group bot notification failed:', err));
                }, 50);
              }

              // Legacy telegram service (non-blocking with timeout)
              setTimeout(async () => {
                try {
                  const { telegramService } = await import('../services/telegram.js');
                  const message = telegramService.formatTransaction(
                    'SEPA',
                    amountAfterCommission,
                    currency || 'EUR',
                    notificationUser.username,
                    notificationUser.full_name || notificationUser.username,
                    undefined,
                    reference,
                    amount, // Initial amount
                    commission // Commission amount  
                  );
                  await Promise.race([
                    telegramService.sendTransactionNotification(message),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
                  ]);
                } catch (err) {
                  console.error('Legacy telegram notification failed:', err);
                }
              }, 100);
            }
          } catch (err) {
            console.error('Notification setup failed:', err);
          }
        });

        // Return deposit details
        const bankDetails = {
          name: "EvokeEssence s.r.o",
          iban: "CZ7527000000001234567890",
          bic: "BACXCZPP",
        };

        res.json({
          reference,
          bankDetails,
          amount: {
            original: amount,
            commission: commission,
            final: amountAfterCommission,
            currency: currency || 'EUR'
          }
        });
      });
    } catch (error) {
      console.error('[API_DEPOSIT_CREATE] Error creating deposit:', error);
      res.status(500).json({
        message: error instanceof Error ? `Failed to create deposit: ${error.message}` : "Failed to create deposit",
        code: 'DEPOSIT_ERROR'
      });
    }
  });

  // Update the SEPA deposit update endpoint
  // This is where the admin can change a deposit status to "successful"
  app.patch("/api/admin/deposits/sepa-:id", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
      console.log(`[ADMIN_DEPOSIT] Starting deposit status update:`, {
        depositId: id,
        newStatus: status,
        timestamp: new Date().toISOString()
      });

      const depositId = parseInt(id);
      if (isNaN(depositId) || depositId <= 0) {
        return res.status(400).json({
          message: "Invalid deposit ID: Must be a positive number"
        });
      }

      if (!['pending', 'successful', 'failed'].includes(status)) {
        return res.status(400).json({
          message: "Invalid status: Must be 'pending', 'successful', or 'failed'"
        });
      }

      await db.transaction(async (tx) => {
        // Get current deposit
        const [deposit] = await tx
          .select()
          .from(sepaDeposits)
          .where(eq(sepaDeposits.id, depositId))
          .limit(1);

        if (!deposit) {
          throw new Error("Deposit not found");
        }

        const previousStatus = deposit.status;
        console.log(`[ADMIN_DEPOSIT] Current deposit status: ${previousStatus}, changing to: ${status}`);

        // Update deposit status
        await tx
          .update(sepaDeposits)
          .set({
            status,
            completedAt: status === 'successful' ? new Date() : null,
          })
          .where(eq(sepaDeposits.id, depositId));

        // Handle balance adjustment if needed
        if ((status === 'successful' && previousStatus !== 'successful') ||
            (previousStatus === 'successful' && status !== 'successful')) {

          console.log('[ADMIN_DEPOSIT] Deposit status change requires balance update:', {
            depositId,
            previousStatus,
            newStatus: status,
            originalDepositAmount: deposit.amount,
            currency: deposit.currency,
            userId: deposit.userId,
            // IMPORTANT: The amount stored in deposit.amount is ALREADY the commission-adjusted amount
            // The commission was already deducted when creating the deposit record
            commissionApplied: true,
            timestamp: new Date().toISOString()
          });

          // Get the commission-adjusted amount from the deposit record
          // IMPORTANT: deposit.amount is already the amount AFTER commission deduction
          const amount = parseFloat(deposit.amount || '0');
          const currency = (deposit.currency || 'EUR') as Currency;

          console.log(`[ADMIN_DEPOSIT] Using commission-adjusted amount for balance update: ${amount} ${currency}`);

          // Get user's current balance BEFORE the update for logging purposes
          const { balance: currentBalance, currency: userCurrency } = await getUserCurrencyPreference(tx, deposit.userId);
          console.log(`[ADMIN_DEPOSIT] User's current balance BEFORE update: ${currentBalance} ${userCurrency}`);

          // When changing to successful, we ADD this amount to the user's balance
          // When changing from successful to another status, we SUBTRACT it
          await updateUserBalance(
            tx,
            deposit.userId,
            amount,
            currency,
            status === 'successful' ? 'add' : 'subtract'
          );

          // Add additional logging to verify balance update
          console.log(`[ADMIN_DEPOSIT] Balance update completed for user ${deposit.userId}`);
          
          // If this is a successful deposit with a contractor referral, process contractor commission
          if (status === 'successful' && deposit.contractorId && deposit.contractorCommission) {
            const contractorId = deposit.contractorId;
            const contractorCommission = parseFloat(deposit.contractorCommission.toString());
            
            console.log(`[ADMIN_DEPOSIT] Processing contractor commission: ${contractorCommission} ${currency} for contractor ID: ${contractorId}`);
            
            // Add the commission amount to the contractor's balance
            await updateUserBalance(
              tx,
              contractorId,
              contractorCommission,
              currency,
              'add'
            );
            
            console.log(`[ADMIN_DEPOSIT] Contractor commission processed successfully`);
          }

          // Get user's updated balance for verification
          const [updatedUser] = await tx
            .select({
              id: users.id,
              balance: users.balance,
              balanceCurrency: users.balance_currency
            })
            .from(users)
            .where(eq(users.id, deposit.userId))
            .limit(1);

          if (updatedUser) {
            console.log(`[ADMIN_DEPOSIT] User's new balance AFTER update: ${updatedUser.balance} ${updatedUser.balanceCurrency}`);
          }
        }

        // Get updated deposit for response
        const [updatedDeposit] = await tx
          .select()
          .from(sepaDeposits)
          .where(eq(sepaDeposits.id, depositId))
          .limit(1);
          
        // Send WebSocket notification for deposit status change
        if (updatedDeposit && deposit.userId) {
          try {
            const amountNum = parseFloat(updatedDeposit.amount || '0');
            const currencyStr = updatedDeposit.currency || 'USD';
            
            console.log(`[WebSocket] Sending depositStatusChanged event to user ${deposit.userId}`);
            
            webSocketService.sendToUser(deposit.userId, {
              type: 'depositStatusChanged',
              userId: deposit.userId,
              data: {
                depositId: updatedDeposit.id,
                status: updatedDeposit.status || 'unknown',
                amount: amountNum,
                currency: currencyStr,
                updatedAt: new Date().toISOString()
              }
            });
          } catch (wsError) {
            console.error('[WebSocket] Error sending deposit notification:', wsError);
            // Continue with the response even if WebSocket fails
          }
        }

        // Send Telegram notifications for deposit status change
        if (updatedDeposit && deposit.userId && status !== previousStatus) {
          try {
            console.log(`[Telegram] Sending deposit status change notification - Status changed from ${previousStatus} to ${status}`);
            
            // Get user information for the notification
            const user = await tx.query.users.findFirst({
              where: eq(users.id, deposit.userId)
            });
            
            if (user) {
              const amountNum = parseFloat(updatedDeposit.amount || '0');
              const currencyStr = updatedDeposit.currency || 'EUR';
              
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
                      amount: amountNum,
                      currency: currencyStr,
                      status: status,
                      reference: updatedDeposit.reference
                    })
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
                const message = telegramService.formatTransaction(
                  'SEPA',
                  amountNum,
                  currencyStr,
                  user.username,
                  user.full_name || user.username,
                  undefined,
                  updatedDeposit.reference || ''
                );
                await telegramService.sendTransactionNotification(message);
                console.log('[Telegram] Legacy service status change notification sent successfully');
              } catch (legacyError) {
                console.error('[Telegram] Legacy service status change notification error:', legacyError);
              }
            }
          } catch (telegramError) {
            console.error('[Telegram] Error sending deposit status change notifications:', telegramError);
            // Continue with the response even if Telegram fails
          }
        }

        res.json({
          success: true,
          message: `Deposit status updated to ${status}`,
          data: updatedDeposit,
          timestamp: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error('[ADMIN_DEPOSIT] Error updating SEPA deposit:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to update deposit status",
        code: 'UPDATE_ERROR'
      });
    }
  });

  // Admin endpoint to view all contractor referrals and performance
  app.get("/api/admin/contractors/referrals", requireAdmin, async (req, res) => {
    try {
      // Get all contractors in the system
      const contractors = await db.query.users.findMany({
        where: eq(users.is_contractor, true),
        orderBy: asc(users.id),
      });

      // For each contractor, get their referral performance
      const contractorsWithReferrals = await Promise.all(
        contractors.map(async (contractor) => {
          const referralCode = contractor.referral_code;
          if (!referralCode) {
            return {
              contractor: {
                id: contractor.id,
                username: contractor.username,
                fullName: contractor.full_name || 'Unknown',
                email: contractor.email || 'Unknown'
              },
              performance: {
                totalReferrals: 0,
                successfulDeposits: 0,
                pendingDeposits: 0,
                totalCommission: {
                  EUR: 0,
                  USD: 0,
                  CHF: 0,
                  GBP: 0
                }
              }
            };
          }

          // Get all deposits with this referral code
          const referralDeposits = await db.query.sepaDeposits.findMany({
            where: eq(sepaDeposits.referralCode, referralCode),
          });

          // Calculate performance metrics
          const totalReferrals = referralDeposits.length;
          const successfulDeposits = referralDeposits.filter(d => d.status === 'successful').length;
          const pendingDeposits = referralDeposits.filter(d => d.status === 'pending').length;

          // Calculate commission by currency
          const commissionsByCurrency = referralDeposits
            .filter(d => d.status === 'successful' && d.contractorCommission)
            .reduce((acc, deposit) => {
              const currency = deposit.currency || 'EUR';
              const commission = parseFloat(deposit.contractorCommission || '0');
              
              if (!acc[currency]) {
                acc[currency] = 0;
              }
              
              acc[currency] += commission;
              return acc;
            }, { EUR: 0, USD: 0, CHF: 0, GBP: 0 } as Record<string, number>);

          // Get the clients referred by this contractor
          const clientIds = Array.from(new Set(referralDeposits.map(d => d.userId)));
          const clientCount = clientIds.length;

          return {
            contractor: {
              id: contractor.id,
              username: contractor.username,
              fullName: contractor.full_name || 'Unknown',
              email: contractor.email || 'Unknown',
              referralCode,
              createdAt: contractor.created_at
            },
            performance: {
              clientCount,
              totalReferrals,
              successfulDeposits,
              pendingDeposits,
              totalCommission: commissionsByCurrency
            }
          };
        })
      );

      res.json({
        contractors: contractorsWithReferrals,
        totalContractors: contractors.length
      });
    } catch (error) {
      console.error('[ADMIN_CONTRACTORS] Error fetching contractor referrals:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch contractor referrals",
        code: 'FETCH_ERROR'
      });
    }
  });

  // Admin endpoint to manage contractor status and commission rates
  app.patch("/api/admin/contractors/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { isContractor, referralCode, contractorCommissionRate } = req.body;

      // Validate input
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check if the user exists
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update contractor status and settings
      const updateData: Record<string, any> = {
        is_contractor: isContractor
      };

      if (referralCode !== undefined) {
        // Check if the referral code is unique
        if (referralCode) {
          const existingCodeUser = await db.query.users.findFirst({
            where: and(
              eq(users.referral_code, referralCode),
              ne(users.id, userId)
            )
          });

          if (existingCodeUser) {
            return res.status(400).json({ 
              message: "Referral code already in use by another contractor",
              code: 'DUPLICATE_CODE'
            });
          }
        }
        
        updateData.referral_code = referralCode;
      }

      if (contractorCommissionRate !== undefined) {
        // Validate commission rate format
        const rate = parseFloat(contractorCommissionRate);
        if (isNaN(rate) || rate < 0 || rate > 0.1) { // Maximum 10% commission
          return res.status(400).json({ 
            message: "Invalid commission rate. Must be between 0 and 0.1 (10%)",
            code: 'INVALID_RATE'
          });
        }
        
        updateData.contractor_commission_rate = rate;
      }

      // Update the user
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      res.json({
        message: "Contractor settings updated successfully",
        contractorSettings: {
          id: updatedUser.id,
          username: updatedUser.username,
          isContractor: updatedUser.is_contractor,
          referralCode: updatedUser.referral_code,
          contractorCommissionRate: updatedUser.contractor_commission_rate
        }
      });
    } catch (error) {
      console.error('[ADMIN_CONTRACTORS] Error updating contractor settings:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to update contractor settings",
        code: 'UPDATE_ERROR'
      });
    }
  });

  // Delete SEPA deposit (admin only, only pending deposits)
  app.delete("/api/admin/deposits/:id", requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
      const [deposit] = await db
        .select()
        .from(sepaDeposits)
        .where(eq(sepaDeposits.id, parseInt(id)))
        .limit(1);

      if (!deposit) {
        return res.status(404).json({ message: "Deposit not found" });
      }

      if (deposit.status !== "pending") {
        return res.status(400).json({ message: "Only pending deposits can be deleted" });
      }

      await db
        .delete(sepaDeposits)
        .where(eq(sepaDeposits.id, parseInt(id)));

      res.json({ message: "Deposit deleted successfully" });
    } catch (error) {
      console.error('Error deleting deposit:', error);
      res.status(500).json({ message: "Failed to delete deposit" });
    }
  });

  // Endpoint for contractors to view deposits associated with their referral code
  app.get("/api/contractor/deposits", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Check if the user is a contractor
      const [userInfo] = await db
        .select({ 
          isContractor: users.is_contractor,
          referralCode: users.referral_code 
        })
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      if (!userInfo?.isContractor) {
        return res.status(403).json({ message: "Access denied. Only contractors can view this data." });
      }

      const referralCode = userInfo.referralCode;
      if (!referralCode) {
        return res.status(400).json({ message: "No referral code assigned to this contractor." });
      }

      // Get deposits that used this contractor's referral code
      const contractorDeposits = await db.query.sepaDeposits.findMany({
        where: eq(sepaDeposits.referralCode, referralCode),
        orderBy: desc(sepaDeposits.createdAt),
      });

      // Get client information for each deposit
      const contractorDepositsWithClientInfo = await Promise.all(
        contractorDeposits.map(async (deposit) => {
          // Get basic client info
          const [client] = await db
            .select({ 
              id: users.id,
              username: users.username,
              fullName: users.full_name,
              email: users.email,
              countryOfResidence: users.country_of_residence
            })
            .from(users)
            .where(eq(users.id, deposit.userId))
            .limit(1);

          const depositAmount = parseFloat(deposit.amount || '0');
          const commissionAmount = parseFloat(deposit.contractorCommission || '0');
          const currency = (deposit.currency || 'EUR') as Currency;

          return {
            depositId: deposit.id,
            reference: deposit.reference,
            date: deposit.createdAt,
            completedAt: deposit.completedAt,
            status: deposit.status,
            amount: depositAmount,
            commission: commissionAmount,
            currency,
            client: {
              id: client?.id,
              username: client?.username,
              fullName: client?.fullName || 'Unknown',
              email: client?.email || 'Unknown',
              country: client?.countryOfResidence || 'Unknown'
            }
          };
        })
      );

      // Calculate total statistics
      const totalDeposits = contractorDeposits.length;
      const successfulDeposits = contractorDeposits.filter(d => d.status === 'successful').length;
      const pendingDeposits = contractorDeposits.filter(d => d.status === 'pending').length;

      // Calculate total commission by currency
      const commissionsByCurrency = contractorDeposits
        .filter(d => d.status === 'successful' && d.contractorCommission)
        .reduce((acc, deposit) => {
          const currency = deposit.currency || 'EUR';
          const commission = parseFloat(deposit.contractorCommission || '0');
          
          if (!acc[currency]) {
            acc[currency] = 0;
          }
          
          acc[currency] += commission;
          return acc;
        }, {} as Record<string, number>);

      res.json({
        deposits: contractorDepositsWithClientInfo,
        stats: {
          totalDeposits,
          successfulDeposits,
          pendingDeposits,
          commissionsByActivity: commissionsByCurrency
        }
      });
    } catch (error) {
      console.error('[CONTRACTOR_DEPOSITS] Error fetching contractor deposits:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch contractor deposits",
        code: 'FETCH_ERROR'
      });
    }
  });

  // Download SEPA deposits as CSV with all currency conversions
  app.get("/api/deposits/download", async (req, res) => {
    try {
      const userDeposits = await db.query.sepaDeposits.findMany({
        where: eq(sepaDeposits.userId, req.user!.id),
        orderBy: desc(sepaDeposits.createdAt),
      });

      // Get user's preferred currency
      const { currency: userCurrency } = await getUserCurrencyPreference(db, req.user!.id);

      // Convert amounts to all supported currencies with validation
      const depositsWithConversions = await Promise.all(
        userDeposits.map(async (deposit) => {
          const amount = parseFloat(deposit.amount || '0');
          const currency = (deposit.currency || 'EUR') as Currency;

          // Convert to all major currencies using validated operations
          const [eurAmount, usdAmount, chfAmount, gbpAmount] = await Promise.all([
            currency === 'EUR' ? amount : convertCurrency(amount, currency, 'EUR'),
            currency === 'USD' ? amount : convertCurrency(amount, currency, 'USD'),
            currency === 'CHF' ? amount : convertCurrency(amount, currency, 'CHF'),
            currency === 'GBP' ? amount : convertCurrency(amount, currency, 'GBP')
          ]);

          // Convert to user's preferred currency if different
          const userPreferredAmount = userCurrency === currency
            ? amount
            : await convertCurrency(amount, currency, userCurrency);

          return {
            ...deposit,
            amountEur: eurAmount,
            amountUsd: usdAmount,
            amountChf: chfAmount,
            amountGbp: gbpAmount,
            amountUserCurrency: userPreferredAmount
          };
        })
      );

      // Generate CSV content with all currency conversions
      const csvHeader = [
        "Date",
        "Reference",
        "Original Amount",
        "Original Currency",
        "EUR Equivalent",
        "USD Equivalent",
        "CHF Equivalent",
        "GBP Equivalent",
        `${userCurrency} (Your Currency)`,
        "Status",
        "Commission Fee"
      ].join(",") + "\n";

      const csvRows = depositsWithConversions.map(deposit => {
        const date = deposit.createdAt ? format(new Date(deposit.createdAt), 'yyyy-MM-dd HH:mm:ss') : '';
        return [
          date,
          deposit.reference,
          deposit.amount,
          deposit.currency,
          deposit.amountEur.toFixed(2),
          deposit.amountUsd.toFixed(2),
          deposit.amountChf.toFixed(2),
          deposit.amountGbp.toFixed(2),
          deposit.amountUserCurrency.toFixed(2),
          deposit.status,
          deposit.commissionFee
        ].join(",");
      }).join("\n");

      const csvContent = csvHeader + csvRows;

      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=deposit-history-${format(new Date(), 'yyyy-MM-dd')}.csv`);

      res.send(csvContent);
    } catch (error) {
      console.error('Error generating deposit history:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to generate deposit history",
        code: 'EXPORT_ERROR'
      });
    }
  });
}

// Update deposit schema with proper validation
const depositSchema = z.object({
  amount: z.union([z.string(), z.number()])
    .transform((val) => typeof val === 'string' ? parseFloat(val) : val)
    .refine((val) => !isNaN(val), "Invalid amount")
    .refine((val) => val >= 100, "Minimum deposit amount is 100")
    .refine((val) => val <= 200000, "Maximum deposit amount is 200,000"),
  currency: z.enum(['EUR', 'USD', 'CHF', 'GBP']).default('EUR'),
  referralCode: z.string().optional()
});