import { Router, Request, Response, NextFunction } from 'express';
import telegramGroupBot from '../services/telegram-group-bot';
import telegramService from '../services/telegram';
import { db } from 'db';
import { users, telegramGroups } from '@db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Health check endpoint for the bot
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'checking',
      timestamp: new Date().toISOString(),
      bot: {
        isPolling: (telegramGroupBot as any).isPolling || false,
        lastUpdate: (telegramGroupBot as any).lastUpdateId || 0
      }
    };

    // Try to get bot info
    const botInfo = await (telegramGroupBot as any).getMe();
    health.status = 'healthy';
    health.bot = {
      ...health.bot,
      botId: botInfo.id,
      username: botInfo.username,
      can_join_groups: botInfo.can_join_groups
    };

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Webhook endpoint for Telegram bot updates
 */
router.post('/webhook/:token', async (req: Request, res: Response) => {
  try {
    // Verify the token matches our bot token
    const expectedToken = process.env.TELEGRAM_GROUP_BOT_TOKEN || '${TELEGRAM_GROUP_BOT_TOKEN}';
    if (req.params.token !== expectedToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Process the update
    await telegramGroupBot.processUpdate(req.body);

    // Telegram expects a 200 OK response
    res.sendStatus(200);
  } catch (error) {
    console.error('[Telegram Webhook] Error processing update:', error);
    res.sendStatus(200); // Still send 200 to avoid Telegram retrying
  }
});

/**
 * Internal API endpoint to trigger user registration notification
 */
router.post('/internal/notify/registration', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    console.log(`[TELEGRAM INTERNAL] Registration notification request for user ID: ${userId}`);

    if (!userId) {
      console.log(`[TELEGRAM INTERNAL] Error: User ID is required`);
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user information
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    console.log(`[TELEGRAM INTERNAL] User lookup result:`, {
      found: !!user,
      username: user?.username,
      referred_by: user?.referred_by,
      id: user?.id
    });

    if (!user) {
      console.log(`[TELEGRAM INTERNAL] Error: User not found for ID ${userId}`);
      return res.status(404).json({ error: 'User not found' });
    }

    // Only send notification if user was referred by a code
    if (user.referred_by) {
      console.log(`[TELEGRAM INTERNAL] User has referral code: ${user.referred_by}, proceeding with notification`);
      // Format the message with timestamp, full name, and email
      const timestamp = new Date().toLocaleString('en-US', { 
        timeZone: 'Europe/Prague',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      const message = `👤 <b>New Registration</b>

<b>Time:</b> ${timestamp}
<b>Full Name:</b> ${user.full_name || 'Not provided'}
<b>Username:</b> ${user.username}
<b>Email:</b> ${user.email || 'Not provided'}

Just registered using this group's referral code.`;

      // Send notification to the group
      await telegramGroupBot.sendNotificationToGroup(
        user.referred_by,
        message,
        'registration',
        user.id
      );

      // Also send to the existing registration bot for backward compatibility
      const oldMessage = telegramService.formatUserRegistration(
        user.username,
        user.full_name || 'Not provided',
        user.email || 'Not provided',
        user.referred_by
      );
      await telegramService.sendRegistrationNotification(oldMessage);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Telegram API] Error sending registration notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * Internal API endpoint to trigger KYC status notification
 */
router.post('/internal/notify/kyc', async (req: Request, res: Response) => {
  try {
    const { userId, status } = req.body;

    if (!userId || !status) {
      return res.status(400).json({ error: 'User ID and status are required' });
    }

    // Get user information
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only send notification if user was referred by a code
    if (user.referred_by) {
      const statusIcon = status === 'approved' ? '✅' : '❌';
      const statusText = status === 'approved' ? 'passed KYC' : 'failed KYC';
      
      const timestamp = new Date().toLocaleString('en-US', { 
        timeZone: 'Europe/Prague',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const message = `${statusIcon} <b>KYC Update</b>

<b>Time:</b> ${timestamp}
<b>Full Name:</b> ${user.full_name || 'Not provided'}
<b>Username:</b> ${user.username}
<b>Email:</b> ${user.email || 'Not provided'}

Has ${statusText}.`;

      // Send notification to the group
      await telegramGroupBot.sendNotificationToGroup(
        user.referred_by,
        message,
        'kyc_status',
        user.id
      );

      // Also send to the existing registration bot
      const oldMessage = telegramService.formatKycVerification(
        user.username,
        user.full_name || 'Not provided',
        status
      );
      await telegramService.sendRegistrationNotification(oldMessage);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Telegram API] Error sending KYC notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * Internal API endpoint to trigger transaction notification
 */
router.post('/internal/notify/transaction', async (req: Request, res: Response) => {
  try {
    const { userId, type, amount, currency, status, reference, initialAmount, commission } = req.body;

    if (!userId || !type || !amount) {
      return res.status(400).json({ error: 'User ID, type, and amount are required' });
    }

    // Get user information
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only send notification if user was referred by a code
    if (user.referred_by) {
      let statusIcon, statusText;
      if (status === 'completed' || status === 'successful') {
        statusIcon = '💸';
        statusText = 'completed';
      } else if (status === 'processing' || status === 'pending') {
        statusIcon = '⏳';
        statusText = 'created';
      } else {
        statusIcon = '❌';
        statusText = 'failed';
      }
      
      const timestamp = new Date().toLocaleString('en-US', { 
        timeZone: 'Europe/Prague',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Create detailed amount breakdown
      let amountInfo = '';
      if (initialAmount && commission && initialAmount !== amount) {
        amountInfo = `<b>Amount Breakdown:</b>
  ├ Initial Amount: ${parseFloat(initialAmount).toLocaleString()} ${currency}
  ├ Commission: -${parseFloat(commission).toLocaleString()} ${currency}
  └ <b>Final Amount: ${parseFloat(amount).toLocaleString()} ${currency}</b>`;
      } else {
        amountInfo = `<b>Amount:</b> ${parseFloat(amount).toLocaleString()} ${currency}`;
      }

      const message = `${statusIcon} <b>Transaction ${statusText}</b>

<b>Time:</b> ${timestamp}
<b>Full Name:</b> ${user.full_name || 'Not provided'}
<b>Username:</b> ${user.username}
<b>Email:</b> ${user.email || 'Not provided'}
<b>Type:</b> ${type}
${amountInfo}${reference ? `\n<b>Reference:</b> ${reference}` : ''}

Transaction has been ${statusText}.`;

      // Send notification to the group
      await telegramGroupBot.sendNotificationToGroup(
        user.referred_by,
        message,
        'transaction',
        user.id
      );

      // Also send to the existing transaction bot with enhanced details
      const oldMessage = telegramService.formatTransaction(
        type as 'SEPA' | 'USDT' | 'USDC',
        amount,
        currency,
        user.username,
        user.full_name || 'Not provided',
        undefined,
        reference,
        initialAmount,
        commission
      );
      await telegramService.sendTransactionNotification(oldMessage);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Telegram API] Error sending transaction notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * Test endpoint to verify bot connection
 */
router.get('/test', async (req: Request, res: Response) => {
  try {
    // Test the existing bots
    const existingBotsTest = await telegramService.testBots();
    
    res.json({
      success: true,
      existingBots: existingBotsTest,
      groupBot: {
        configured: !!process.env.TELEGRAM_GROUP_BOT_TOKEN,
        ownerConfigured: !!process.env.TELEGRAM_OWNER_ID
      }
    });
  } catch (error) {
    console.error('[Telegram API] Test failed:', error);
    res.status(500).json({ error: 'Test failed' });
  }
});

/**
 * Get group statistics (admin only)
 */
router.get('/groups', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // This should be protected by admin authentication middleware
    const groups = await db.query.telegramGroups.findMany({
      where: eq(telegramGroups.is_active, true)
    });

    const groupStats = await Promise.all(groups.map(async (group) => {
      // Count users referred by this group
      const referredUsers = await db.query.users.findMany({
        where: eq(users.referred_by, group.referral_code)
      });

      return {
        ...group,
        totalUsers: referredUsers.length,
        verifiedUsers: referredUsers.filter(u => u.kyc_status === 'approved').length,
        pendingKyc: referredUsers.filter(u => u.kyc_status === 'pending').length
      };
    }));

    res.json({ success: true, groups: groupStats });
  } catch (error) {
    console.error('[Telegram API] Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

export default router;