import axios from 'axios';
import { db } from 'db';
import { telegramGroups, telegramNotifications, users } from '@db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      username?: string;
      first_name: string;
    };
    chat: {
      id: number;
      title?: string;
      type: string; // 'private', 'group', 'supergroup'
    };
    text?: string;
    new_chat_members?: Array<{
      id: number;
      is_bot: boolean;
      username?: string;
    }>;
  };
  my_chat_member?: {
    chat: {
      id: number;
      title?: string;
      type: string;
    };
    new_chat_member: {
      user: {
        id: number;
        is_bot: boolean;
      };
      status: string; // 'member', 'administrator', 'left', 'kicked'
    };
  };
}

class TelegramGroupBot {
  private botToken: string;
  private ownerTelegramId: string;
  private botId: number | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private lastUpdateId: number = 0;
  private keepAliveInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Use environment variable or the correct group bot token (EvokeEssenceBot that can join groups)
    this.botToken = process.env.TELEGRAM_GROUP_BOT_TOKEN || '${TELEGRAM_GROUP_BOT_TOKEN}';
    this.ownerTelegramId = process.env.TELEGRAM_OWNER_ID || '7742418800';
    
    // Handle process termination gracefully
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    process.on('exit', () => this.cleanup());
  }

  /**
   * Initialize the bot and get bot information
   */
  async initialize(): Promise<void> {
    try {
      // Prevent multiple initializations
      if (this.isPolling) {
        console.log('[TelegramGroupBot] Already initialized and polling');
        return;
      }

      // Check if we're in production and auto-setup webhook
      // Production detection based on database URL
      const dbUrl = process.env.DATABASE_URL || process.env.REPLIT_DB_URL || '';
      const actualProduction = process.env.NODE_ENV === 'production' || 
                              process.env.REPLIT_DEPLOYMENT === 'true' ||
                              dbUrl.includes('replit.com') ||
                              dbUrl.includes('neon.tech') ||
                              (!dbUrl.includes('localhost') && dbUrl.includes('postgresql://'));
      
      // Use webhook for production deployment OR when Always On is active
      const isProduction = process.env.NODE_ENV === 'production' || 
                          process.env.REPLIT_DEPLOYMENT === 'true' || 
                          process.env.REPLIT_ENVIRONMENT === 'production' ||
                          process.env.REPLIT_ALWAYS_ON === 'true';
      
      console.log('[TelegramGroupBot] Environment check:', {
        NODE_ENV: process.env.NODE_ENV || 'undefined',
        REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT || 'undefined',
        REPLIT_ENVIRONMENT: process.env.REPLIT_ENVIRONMENT || 'undefined',
        REPLIT_ALWAYS_ON: process.env.REPLIT_ALWAYS_ON || 'undefined',
        DATABASE_URL: dbUrl ? 'present' : 'missing',
        dbIncludes: {
          replit: dbUrl.includes('replit.com'),
          neon: dbUrl.includes('neon.tech'),
          localhost: dbUrl.includes('localhost')
        },
        actualProduction,
        isProduction: isProduction,
        note: isProduction ? 'Production/Always On: Webhook mode enabled' : 'Development: Using polling mode'
      });
      
      // Set up webhook for true production deployment
      if (isProduction) {
        console.log('[TelegramGroupBot] 🚀 PRODUCTION/ALWAYS ON detected - setting up webhook for 24/7 operation...');
        const webhookUrl = 'https://evo-exchange.com/api/webhook/telegram';
        
        try {
          // Test webhook endpoint accessibility first
          console.log('[TelegramGroupBot] Testing webhook endpoint...');
          const testResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
          });
          
          if (testResponse.ok) {
            const webhookSet = await this.setWebhook(webhookUrl);
            if (webhookSet) {
              console.log('[TelegramGroupBot] ✅ WEBHOOK ACTIVATED - Bot now running 24/7!');
              console.log('[TelegramGroupBot] 🌐 Webhook URL:', webhookUrl);
              console.log('[TelegramGroupBot] 🎉 Bot will continue running even when you close this window!');
              return; // Exit - no polling needed
            }
          } else {
            console.log('[TelegramGroupBot] ❌ Webhook endpoint not accessible, using polling');
          }
        } catch (webhookError) {
          console.log('[TelegramGroupBot] Webhook test failed, using polling:', webhookError);
        }
      } else {
        console.log('[TelegramGroupBot] Development mode - using polling (works while Replit is open)');
        console.log('[TelegramGroupBot] 💡 For 24/7 operation, visit: http://localhost:5000/manual-webhook-setup.html');
        console.log('[TelegramGroupBot] 💡 Or deploy to production with NODE_ENV=production');
      }

      const botInfo = await this.getMe();
      this.botId = botInfo.id;
      console.log('[TelegramGroupBot] Bot initialized:', botInfo.username);
      
      // Always clear webhook and use polling for now
      await this.clearWebhook();
      console.log('[TelegramGroupBot] Cleared any existing webhook');
      console.log('[TelegramGroupBot] Starting polling mode...');
      this.startPolling();
      this.startKeepAlive();
    } catch (error) {
      console.error('[TelegramGroupBot] Failed to initialize:', error);
    }
  }

  /**
   * Get bot information
   */
  private async getMe(): Promise<any> {
    const url = `https://api.telegram.org/bot${this.botToken}/getMe`;
    const response = await axios.get(url);
    if (!response.data.ok) {
      throw new Error(`Telegram API error: ${response.data.description}`);
    }
    return response.data.result;
  }

  /**
   * Generate a unique referral code for a group (5 characters, letters and numbers only)
   */
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Generate 5 random characters
    for (let i = 0; i < 5; i++) {
      const randomIndex = crypto.randomInt(chars.length);
      code += chars[randomIndex];
    }
    
    return code;
  }

  /**
   * Handle bot being added to a group
   */
  async handleGroupJoin(groupId: string, groupName?: string): Promise<void> {
    try {
      console.log(`[TelegramGroupBot] ===== HANDLING GROUP JOIN =====`);
      console.log(`[TelegramGroupBot] Group ID: ${groupId}`);
      console.log(`[TelegramGroupBot] Group Name: ${groupName || 'Unknown'}`);

      // Check if group already exists
      const existingGroup = await db.query.telegramGroups.findFirst({
        where: eq(telegramGroups.telegram_group_id, groupId)
      });

      if (existingGroup) {
        console.log(`[TelegramGroupBot] Group already exists in database`);
        console.log(`[TelegramGroupBot] Existing referral code: ${existingGroup.referral_code}`);
        console.log(`[TelegramGroupBot] Sending welcome message to existing group...`);
        await this.sendWelcomeMessage(groupId, existingGroup.referral_code);
        console.log(`[TelegramGroupBot] ===== GROUP JOIN COMPLETE (EXISTING) =====`);
        return;
      }

      console.log(`[TelegramGroupBot] New group detected, generating referral code...`);

      // Generate unique referral code
      let referralCode = this.generateReferralCode();
      let codeExists = true;
      let attempts = 0;

      while (codeExists && attempts < 10) {
        const existing = await db.query.telegramGroups.findFirst({
          where: eq(telegramGroups.referral_code, referralCode)
        });
        if (!existing) {
          codeExists = false;
        } else {
          referralCode = this.generateReferralCode();
          attempts++;
        }
      }

      console.log(`[TelegramGroupBot] Generated unique referral code: ${referralCode} (attempts: ${attempts + 1})`);

      // Insert new group
      const newGroupData = {
        telegram_group_id: groupId,
        group_name: groupName || 'Unknown Group',
        referral_code: referralCode,
        owner_telegram_id: this.ownerTelegramId,
        is_active: true,
        metadata: { joined_at: new Date().toISOString() }
      };

      console.log(`[TelegramGroupBot] Inserting group into database:`, newGroupData);

      await db.insert(telegramGroups).values(newGroupData);

      console.log(`[TelegramGroupBot] Group successfully registered in database`);
      console.log(`[TelegramGroupBot] Sending welcome message...`);
      
      await this.sendWelcomeMessage(groupId, referralCode);
      
      console.log(`[TelegramGroupBot] ===== GROUP JOIN COMPLETE (NEW) =====`);

    } catch (error) {
      console.error('[TelegramGroupBot] ===== ERROR IN GROUP JOIN =====');
      console.error('[TelegramGroupBot] Error details:', error);
      console.error('[TelegramGroupBot] Group ID:', groupId);
      console.error('[TelegramGroupBot] Group Name:', groupName);
      console.error('[TelegramGroupBot] =====================================');
    }
  }

  /**
   * Send welcome message to group
   */
  private async sendWelcomeMessage(chatId: string, referralCode: string): Promise<void> {
    const message = `🎉 <b>Welcome to EvokeEssence Exchange!</b>

I'm the official EvokeEssence bot, and this group has been assigned a unique referral code to track user registrations and activity.

📋 <b>Group Referral Code:</b> <code>${referralCode}</code>
🔗 <b>Register here:</b> https://evo-exchange.com/auth?ref=${referralCode}

⚠️ <b>Important:</b>
New users must register using this referral link and code. If the code is not used during signup, we won't be able to track the user or provide support.

⸻

✅ <b>How It Works – Client Flow:</b>
   • <b>Use the Group Referral Link</b>
Clients must register using the unique referral link provided in this group.
🔗 Example: https://evo-exchange.com/auth?ref=${referralCode}
    • <b>Create an Account</b>
Users enter their basic details and create login credentials on the platform.
    • <b>Verify Identity (KYC)</b>
After registering, users complete KYC directly through the dashboard.
📎 Required: ID document, selfie, and address confirmation.
    • <b>KYC Approval</b>
Verification typically takes 1–3 minutes.
🔓 Once a client is verified, please notify us here in the group so we can manually unlock their account.
    • <b>Deposit Funds & Trade</b>
After verification, the client can create a deposit and wire funds to the provided IBAN.
💶 Once the funds are received, we will credit the client's account and post a confirmation here in the group.
✅ The client can then immediately buy crypto and withdraw USDC.

🌍 We accept clients from EU countries only.

📢 <b>This group will be notified when:</b>
• A new user registers
• A user passes or failes KYC
• A transaction is created, completed or fails

Need assistance? Contact @evokeessence`;

    try {
      console.log(`[TelegramGroupBot] Sending welcome message to chat ${chatId} with referral code ${referralCode}`);
      await this.sendMessage(chatId, message);
      console.log(`[TelegramGroupBot] ✅ Welcome message sent successfully to chat ${chatId}`);
    } catch (error) {
      console.error(`[TelegramGroupBot] ❌ Failed to send welcome message to chat ${chatId}:`, error);
      console.error(`[TelegramGroupBot] 📝 Note: Group was registered successfully with referral code ${referralCode}, but welcome message failed`);
      console.error(`[TelegramGroupBot] 🔧 This usually means:`);
      console.error(`[TelegramGroupBot]    • Bot lacks permission to send messages in this group`);
      console.error(`[TelegramGroupBot]    • Group has restricted bot messaging`);
      console.error(`[TelegramGroupBot]    • Group was deleted or chat ID is invalid`);
      console.error(`[TelegramGroupBot] 💡 Solution: Check group permissions or re-add bot with proper permissions`);
      // Don't throw the error to prevent group registration from failing
    }
  }

  /**
   * Handle commands from users
   */
  async handleCommand(update: TelegramUpdate): Promise<void> {
    if (!update.message || !update.message.text) return;

    const chatId = update.message.chat.id.toString();
    const userId = update.message.from.id.toString();
    const command = update.message.text.split(' ')[0];

    // Public commands (no auth check)
    if (command === '/ping') {
      await this.handlePingCommand(chatId);
      return;
    }

    // Check if user is the owner for all other commands
    if (userId !== this.ownerTelegramId) {
      await this.sendMessage(chatId, '⚠️ You are not authorized to use bot commands.');
      return;
    }

    switch (command) {
      case '/ref':
        await this.handleRefCommand(chatId);
        break;
      case '/stats':
        const statsArg = update.message.text.split(' ')[1];
        if (statsArg === 'month') {
          await this.handleStatsMonthCommand(chatId);
        } else {
          await this.handleStatsCommand(chatId);
        }
        break;
      case '/delete':
        const deleteArgs = update.message.text.split(' ');
        const deleteArg = deleteArgs[1];
        const confirmArg = deleteArgs[2];
        
        // Check if this is a group ID with confirmation
        if (deleteArg && confirmArg === 'confirm') {
          // This is a group ID confirmation - handle specific group deletion confirmation
          await this.handleDeleteGroupConfirmCommand(chatId, deleteArg);
        } else if (deleteArg && deleteArg !== 'confirm') {
          // This is a group ID - handle specific group deletion
          await this.handleDeleteGroupCommand(chatId, deleteArg);
        } else {
          // This is current group deletion or confirmation
          await this.handleDeleteCommand(chatId, deleteArg);
        }
        break;
      case '/help':
        await this.handleHelpCommand(chatId);
        break;
      case '/groups':
        await this.handleGroupsCommand(chatId);
        break;
      case '/reset':
        const resetGroupId = update.message.text.split(' ')[1];
        if (resetGroupId) {
          await this.handleResetCommand(chatId, resetGroupId);
        } else {
          await this.sendMessage(chatId, '❌ Please provide a group ID: /reset GROUP_ID');
        }
        break;
      case '/kyc':
        const kycGroupId = update.message.text.split(' ')[1];
        if (kycGroupId) {
          await this.handleKycCommand(chatId, kycGroupId);
        } else {
          await this.sendMessage(chatId, '❌ Please provide a group ID: /kyc GROUP_ID');
        }
        break;
      case '/transactions':
        const transGroupId = update.message.text.split(' ')[1];
        if (transGroupId) {
          await this.handleTransactionsCommand(chatId, transGroupId);
        } else {
          await this.sendMessage(chatId, '❌ Please provide a group ID: /transactions GROUP_ID');
        }
        break;
      case '/testwelcome':
        const testGroupId = update.message.text.split(' ')[1];
        if (testGroupId) {
          await this.handleTestWelcomeCommand(chatId, testGroupId);
        } else {
          await this.sendMessage(chatId, '❌ Please provide a group ID: /testwelcome GROUP_ID');
        }
        break;
      case '/registernew':
        await this.handleRegisterNewCommand(chatId, update.message);
        break;
      default:
        if (command.startsWith('/')) {
          await this.sendMessage(chatId, '❓ Unknown command. Use /help for available commands.');
        }
    }
  }

  /**
   * Handle /ref command - resend referral link
   */
  private async handleRefCommand(chatId: string): Promise<void> {
    try {
      const group = await db.query.telegramGroups.findFirst({
        where: eq(telegramGroups.telegram_group_id, chatId)
      });

      if (!group) {
        await this.sendMessage(chatId, '❌ This group is not registered.');
        return;
      }

      const message = `📋 <b>Group Referral Code:</b> <code>${group.referral_code}</code>

🔗 <b>Registration Link:</b>
https://evo-exchange.com/auth?ref=${group.referral_code}

Share this link with potential clients to track their registrations and earn commissions.`;

      await this.sendMessage(chatId, message);
    } catch (error) {
      console.error('[TelegramGroupBot] Error handling /ref command:', error);
      await this.sendMessage(chatId, '❌ Error retrieving referral information.');
    }
  }

  /**
   * Handle /stats command - show group statistics
   */
  private async handleStatsCommand(chatId: string): Promise<void> {
    try {
      const group = await db.query.telegramGroups.findFirst({
        where: eq(telegramGroups.telegram_group_id, chatId)
      });

      if (!group) {
        await this.sendMessage(chatId, '❌ This group is not registered.');
        return;
      }

      // Get statistics for users referred by this group's code
      const referredUsers = await db.query.users.findMany({
        where: eq(users.referred_by, group.referral_code)
      });

      const totalUsers = referredUsers.length;
      const verifiedUsers = referredUsers.filter(u => u.kyc_status === 'approved').length;
      const pendingKyc = referredUsers.filter(u => u.kyc_status === 'pending').length;

      // Get user IDs for transaction queries
      const userIds = referredUsers.map(u => u.id);
      
      // Calculate transaction counts and volumes by status
      let totalTransactions = 0;
      let totalVolume = 0;
      let monthlyVolume = 0;
      
      // Status breakdowns
      let pendingTransactions = 0;
      let pendingVolume = 0;
      let successfulTransactions = 0;
      let successfulVolume = 0;
      let failedTransactions = 0;
      let failedVolume = 0;

      // Separate SEPA and Crypto volumes
      let sepaVolume = { total: 0, pending: 0, successful: 0, failed: 0, monthly: 0 };
      let cryptoVolume = { total: 0, pending: 0, successful: 0, failed: 0, monthly: 0 };

      if (userIds.length > 0) {
        // Import necessary schemas and functions
        const { inArray } = await import('drizzle-orm');
        const { sepaDeposits, usdtOrders, usdcOrders } = await import('@db/schema');
        
        // Calculate start of current month for monthly stats
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Get SEPA deposits
        const sepaResults = await db.query.sepaDeposits.findMany({
          where: inArray(sepaDeposits.userId, userIds)
        });
        
        // Get USDT orders
        const usdtResults = await db.query.usdtOrders.findMany({
          where: inArray(usdtOrders.userId, userIds)
        });
        
        // Get USDC orders
        const usdcResults = await db.query.usdcOrders.findMany({
          where: inArray(usdcOrders.userId, userIds)
        });
        
        // Process SEPA deposits by status
        sepaResults.forEach(deposit => {
          const amount = parseFloat(deposit.amount?.toString() || '0');
          totalTransactions++;
          totalVolume += amount;
          sepaVolume.total += amount;
          
          if (deposit.createdAt && new Date(deposit.createdAt) >= startOfMonth && (deposit.status === 'successful' || deposit.status === 'completed')) {
            monthlyVolume += amount;
            sepaVolume.monthly += amount;
          }
          
          switch (deposit.status) {
            case 'pending':
              pendingTransactions++;
              pendingVolume += amount;
              sepaVolume.pending += amount;
              break;
            case 'successful':
            case 'completed':
              successfulTransactions++;
              successfulVolume += amount;
              sepaVolume.successful += amount;
              break;
            case 'failed':
            case 'cancelled':
              failedTransactions++;
              failedVolume += amount;
              sepaVolume.failed += amount;
              break;
          }
        });
        
        // Process USDT orders by status
        usdtResults.forEach(order => {
          const amount = parseFloat(order.amountUsdt?.toString() || '0');
          totalTransactions++;
          totalVolume += amount;
          cryptoVolume.total += amount;
          
          if (order.createdAt && new Date(order.createdAt) >= startOfMonth && (order.status === 'completed' || order.status === 'successful')) {
            monthlyVolume += amount;
            cryptoVolume.monthly += amount;
          }
          
          switch (order.status) {
            case 'pending':
            case 'processing':
              pendingTransactions++;
              pendingVolume += amount;
              cryptoVolume.pending += amount;
              break;
            case 'completed':
            case 'successful':
              successfulTransactions++;
              successfulVolume += amount;
              cryptoVolume.successful += amount;
              break;
            case 'failed':
            case 'cancelled':
              failedTransactions++;
              failedVolume += amount;
              cryptoVolume.failed += amount;
              break;
          }
        });
        
        // Process USDC orders by status
        usdcResults.forEach(order => {
          const amount = parseFloat(order.amountUsdc?.toString() || '0');
          totalTransactions++;
          totalVolume += amount;
          cryptoVolume.total += amount;
          
          if (order.createdAt && new Date(order.createdAt) >= startOfMonth && (order.status === 'completed' || order.status === 'successful')) {
            monthlyVolume += amount;
            cryptoVolume.monthly += amount;
          }
          
          switch (order.status) {
            case 'pending':
            case 'processing':
              pendingTransactions++;
              pendingVolume += amount;
              cryptoVolume.pending += amount;
              break;
            case 'completed':
            case 'successful':
              successfulTransactions++;
              successfulVolume += amount;
              cryptoVolume.successful += amount;
              break;
            case 'failed':
            case 'cancelled':
              failedTransactions++;
              failedVolume += amount;
              cryptoVolume.failed += amount;
              break;
          }
        });
      }

      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });
      const message = `📊 <b>Group Statistics</b>

👥 <b>Total Registrations:</b> ${totalUsers}
✅ <b>Verified Users:</b> ${verifiedUsers}
⏳ <b>Pending KYC:</b> ${pendingKyc}

💳 <b>Transaction Overview:</b>
 • Total: ${totalTransactions}
 • ⏳ Pending: ${pendingTransactions}
 • ✅ Successful: ${successfulTransactions}
 • ❌ Failed: ${failedTransactions}

🏦 <b>SEPA Volume:</b>
 • Total: €${sepaVolume.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 • ⏳ Pending: €${sepaVolume.pending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 • ✅ Successful: €${sepaVolume.successful.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 • ❌ Failed: €${sepaVolume.failed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

₿ <b>Crypto Volume:</b>
 • Total: $${cryptoVolume.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
 • ⏳ Pending: $${cryptoVolume.pending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
 • ✅ Successful: $${cryptoVolume.successful.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
 • ❌ Failed: $${cryptoVolume.failed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC

📈 <b>Monthly Volume (${currentMonth}):</b>
 • 🏦 SEPA: €${sepaVolume.monthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 • ₿ Crypto: $${cryptoVolume.monthly.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
 • 📊 Total: €${monthlyVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

📋 <b>Referral Code:</b> <code>${group.referral_code}</code>
📅 <b>Group Added:</b> ${group.created_at ? new Date(group.created_at).toLocaleDateString() : 'Unknown'}`;

      await this.sendMessage(chatId, message);
    } catch (error) {
      console.error('[TelegramGroupBot] Error handling /stats command:', error);
      await this.sendMessage(chatId, '❌ Error retrieving statistics.');
    }
  }

  /**
   * Handle /stats month command - Enhanced monthly statistics
   */
  private async handleStatsMonthCommand(chatId: string): Promise<void> {
    try {
      const group = await db.query.telegramGroups.findFirst({
        where: eq(telegramGroups.telegram_group_id, chatId)
      });

      if (!group) {
        await this.sendMessage(chatId, '❌ This group is not registered.');
        return;
      }

      // Get all users with this referral code
      const { users } = await import('@db/schema');
      const { inArray, gte } = await import('drizzle-orm');
      
      const groupUsers = await db.query.users.findMany({
        where: eq(users.referralCode, group.referral_code)
      });

      const userIds = groupUsers.map(user => user.id);

      // Calculate start of current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      let monthlyStats = {
        registrations: 0,
        kycApproved: 0,
        sepaDeposits: { count: 0, volume: 0, successful: 0, pending: 0, failed: 0 },
        usdtOrders: { count: 0, volume: 0, successful: 0, pending: 0, failed: 0 },
        usdcOrders: { count: 0, volume: 0, successful: 0, pending: 0, failed: 0 }
      };

      // Count monthly registrations
      monthlyStats.registrations = groupUsers.filter(user => 
        new Date(user.createdAt) >= startOfMonth
      ).length;

      // Count monthly KYC approvals
      monthlyStats.kycApproved = groupUsers.filter(user => 
        user.kyc_status === 'approved' && 
        user.kyc_approved_at && 
        new Date(user.kyc_approved_at) >= startOfMonth
      ).length;

      if (userIds.length > 0) {
        const { sepaDeposits, usdtOrders, usdcOrders } = await import('@db/schema');
        
        // Get monthly SEPA deposits
        const monthlySepaDeposits = await db.query.sepaDeposits.findMany({
          where: inArray(sepaDeposits.userId, userIds) && gte(sepaDeposits.createdAt, startOfMonth)
        });
        
        // Process SEPA deposits
        monthlySepaDeposits.forEach(deposit => {
          const amount = parseFloat(deposit.amount?.toString() || '0');
          monthlyStats.sepaDeposits.count++;
          monthlyStats.sepaDeposits.volume += amount;
          
          switch (deposit.status) {
            case 'successful': 
            case 'completed':
              monthlyStats.sepaDeposits.successful++;
              break;
            case 'pending':
              monthlyStats.sepaDeposits.pending++;
              break;
            case 'failed': 
            case 'cancelled':
              monthlyStats.sepaDeposits.failed++;
              break;
          }
        });

        // Get monthly USDT orders
        const monthlyUsdtOrders = await db.query.usdtOrders.findMany({
          where: inArray(usdtOrders.userId, userIds) && gte(usdtOrders.createdAt, startOfMonth)
        });
        
        // Process USDT orders
        monthlyUsdtOrders.forEach(order => {
          const amount = parseFloat(order.amountUsdt?.toString() || '0');
          monthlyStats.usdtOrders.count++;
          monthlyStats.usdtOrders.volume += amount;
          
          switch (order.status) {
            case 'completed': 
            case 'successful':
              monthlyStats.usdtOrders.successful++;
              break;
            case 'pending': 
            case 'processing':
              monthlyStats.usdtOrders.pending++;
              break;
            case 'failed': 
            case 'cancelled':
              monthlyStats.usdtOrders.failed++;
              break;
          }
        });

        // Get monthly USDC orders
        const monthlyUsdcOrders = await db.query.usdcOrders.findMany({
          where: inArray(usdcOrders.userId, userIds) && gte(usdcOrders.createdAt, startOfMonth)
        });
        
        // Process USDC orders
        monthlyUsdcOrders.forEach(order => {
          const amount = parseFloat(order.amountUsdc?.toString() || '0');
          monthlyStats.usdcOrders.count++;
          monthlyStats.usdcOrders.volume += amount;
          
          switch (order.status) {
            case 'completed': 
            case 'successful':
              monthlyStats.usdcOrders.successful++;
              break;
            case 'pending': 
            case 'processing':
              monthlyStats.usdcOrders.pending++;
              break;
            case 'failed': 
            case 'cancelled':
              monthlyStats.usdcOrders.failed++;
              break;
          }
        });
      }

      const totalMonthlyVolume = monthlyStats.sepaDeposits.volume + monthlyStats.usdtOrders.volume + monthlyStats.usdcOrders.volume;
      const totalMonthlyTransactions = monthlyStats.sepaDeposits.count + monthlyStats.usdtOrders.count + monthlyStats.usdcOrders.count;

      const message = `📊 <b>Monthly Statistics - ${monthName}</b>

👥 <b>User Activity:</b>
 • New Registrations: ${monthlyStats.registrations}
 • KYC Approved: ${monthlyStats.kycApproved}

💳 <b>Transaction Summary:</b>
 • Total Transactions: ${totalMonthlyTransactions}
 • Total Volume: €${totalMonthlyVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

💶 <b>SEPA Deposits:</b>
 • Count: ${monthlyStats.sepaDeposits.count}
 • Volume: €${monthlyStats.sepaDeposits.volume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 • ✅ Successful: ${monthlyStats.sepaDeposits.successful}
 • ⏳ Pending: ${monthlyStats.sepaDeposits.pending}
 • ❌ Failed: ${monthlyStats.sepaDeposits.failed}

💰 <b>USDT Orders:</b>
 • Count: ${monthlyStats.usdtOrders.count}
 • Volume: $${monthlyStats.usdtOrders.volume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 • ✅ Successful: ${monthlyStats.usdtOrders.successful}
 • ⏳ Pending: ${monthlyStats.usdtOrders.pending}
 • ❌ Failed: ${monthlyStats.usdtOrders.failed}

💎 <b>USDC Orders:</b>
 • Count: ${monthlyStats.usdcOrders.count}
 • Volume: $${monthlyStats.usdcOrders.volume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
 • ✅ Successful: ${monthlyStats.usdcOrders.successful}
 • ⏳ Pending: ${monthlyStats.usdcOrders.pending}
 • ❌ Failed: ${monthlyStats.usdcOrders.failed}

📋 <b>Referral Code:</b> <code>${group.referral_code}</code>`;

      await this.sendMessage(chatId, message);
    } catch (error) {
      console.error('[TelegramGroupBot] Error handling /stats month command:', error);
      await this.sendMessage(chatId, '❌ Error retrieving monthly statistics.');
    }
  }

  /**
   * Handle /delete groupid command - Delete specific group by ID
   */
  private async handleDeleteGroupCommand(chatId: string, groupId: string): Promise<void> {
    try {
      // Check if the groupId looks like a confirmation attempt
      if (groupId === 'confirm') {
        await this.sendMessage(chatId, '❌ Please specify a group ID: /delete GROUP_ID');
        return;
      }

      // Find the target group
      const targetGroup = await db.query.telegramGroups.findFirst({
        where: eq(telegramGroups.telegram_group_id, groupId)
      });

      if (!targetGroup) {
        await this.sendMessage(chatId, `❌ Group with ID <code>${groupId}</code> not found.`);
        return;
      }

      // Get user count for the target group
      const userCount = await this.getUserCount(targetGroup.referral_code);
      
      const confirmMessage = `⚠️ <b>Delete Group Confirmation</b>

You are about to delete the following group from the EvokeEssence referral system:

📋 <b>Group Details:</b>
• ID: <code>${targetGroup.telegram_group_id}</code>
• Name: ${targetGroup.group_name || 'Unknown'}
• Referral Code: <code>${targetGroup.referral_code}</code>
• Users Registered: ${userCount}
• Status: ${targetGroup.is_active ? '🟢 Active' : '🔴 Inactive'}

⚠️ <b>Warning:</b>
• This action cannot be undone
• All tracking for this group will be lost
• Users who registered with this referral code will still exist but won't be linked to this group
• The referral code will become invalid for new registrations

To confirm deletion, send: <code>/delete ${groupId} confirm</code>
To cancel, ignore this message.`;

      await this.sendMessage(chatId, confirmMessage);

    } catch (error) {
      console.error('[TelegramGroupBot] Error handling /delete groupid command:', error);
      await this.sendMessage(chatId, '❌ Error processing delete request.');
    }
  }

  /**
   * Handle /delete groupid confirm command - Execute specific group deletion
   */
  private async handleDeleteGroupConfirmCommand(chatId: string, groupId: string): Promise<void> {
    try {
      // Find the target group
      const targetGroup = await db.query.telegramGroups.findFirst({
        where: eq(telegramGroups.telegram_group_id, groupId)
      });

      if (!targetGroup) {
        await this.sendMessage(chatId, `❌ Group with ID <code>${groupId}</code> not found.`);
        return;
      }

      // Perform the deletion
      await db.delete(telegramGroups).where(eq(telegramGroups.telegram_group_id, groupId));
      
      const successMessage = `✅ <b>Group Deleted Successfully</b>

The following group has been removed from the EvokeEssence referral system:

📋 <b>Deleted Group:</b>
• ID: <code>${targetGroup.telegram_group_id}</code>
• Name: ${targetGroup.group_name || 'Unknown'}
• Referral Code: <code>${targetGroup.referral_code}</code>

📋 <b>What happens now:</b>
• This group is no longer tracked
• The referral code <code>${targetGroup.referral_code}</code> is deactivated
• Users who already registered will keep their accounts
• New users cannot register with this referral code

The group's bot will continue to function for commands but won't track new activity.

Thank you for using EvokeEssence! 👋`;

      await this.sendMessage(chatId, successMessage);
      
      console.log(`[TelegramGroupBot] Group deleted via ID: ${targetGroup.group_name} (${groupId})`);

    } catch (error) {
      console.error('[TelegramGroupBot] Error handling /delete groupid confirm command:', error);
      await this.sendMessage(chatId, '❌ Error processing delete confirmation.');
    }
  }

  /**
   * Handle /delete command - Delete the current group
   */
  private async handleDeleteCommand(chatId: string, confirmArg?: string): Promise<void> {
    try {
      const group = await db.query.telegramGroups.findFirst({
        where: eq(telegramGroups.telegram_group_id, chatId)
      });

      if (!group) {
        await this.sendMessage(chatId, '❌ This group is not registered.');
        return;
      }

      // Check if this is the confirmation
      if (confirmArg === 'confirm') {
        // Perform the deletion
        await db.delete(telegramGroups).where(eq(telegramGroups.telegram_group_id, chatId));
        
        await this.sendMessage(chatId, `✅ <b>Group Deleted Successfully</b>

The group has been removed from the EvokeEssence referral system.

📋 <b>What happens now:</b>
• This group is no longer tracked
• The referral code <code>${group.referral_code}</code> is deactivated
• Users who already registered will keep their accounts
• New users cannot register with this referral code

The bot will continue to function for commands but won't track new activity.

Thank you for using EvokeEssence! 👋`);
        
        console.log(`[TelegramGroupBot] Group deleted: ${group.group_name} (${chatId})`);
      } else {
        // Show confirmation message
        const userCount = await this.getUserCount(group.referral_code);
        const confirmMessage = `⚠️ <b>Delete Group Confirmation</b>

You are about to delete this group from the EvokeEssence referral system.

📋 <b>Group Details:</b>
• Name: ${group.group_name}
• Referral Code: <code>${group.referral_code}</code>
• Users Registered: ${userCount}

⚠️ <b>Warning:</b>
• This action cannot be undone
• All tracking for this group will be lost
• Users who registered with this referral code will still exist but won't be linked to this group
• The referral code will become invalid for new registrations

To confirm deletion, send: <code>/delete confirm</code>
To cancel, ignore this message.`;

        await this.sendMessage(chatId, confirmMessage);
      }

    } catch (error) {
      console.error('[TelegramGroupBot] Error handling /delete command:', error);
      await this.sendMessage(chatId, '❌ Error processing delete request.');
    }
  }

  /**
   * Handle /testwelcome command - Test welcome message functionality
   */
  private async handleTestWelcomeCommand(chatId: string, testGroupId: string): Promise<void> {
    try {
      // Find the group in database
      const group = await db.query.telegramGroups.findFirst({
        where: eq(telegramGroups.telegram_group_id, testGroupId)
      });

      if (!group) {
        await this.sendMessage(chatId, `❌ Group with ID <code>${testGroupId}</code> not found in database.`);
        return;
      }

      await this.sendMessage(chatId, `🧪 Testing welcome message for group: ${group.group_name || 'Unknown'} (${testGroupId})`);
      
      // Test sending welcome message
      await this.sendWelcomeMessage(testGroupId, group.referral_code);
      
      await this.sendMessage(chatId, `✅ Welcome message test completed. Check the target group and server logs for results.`);

    } catch (error) {
      console.error('[TelegramGroupBot] Error in test welcome command:', error);
      await this.sendMessage(chatId, '❌ Error testing welcome message.');
    }
  }

  /**
   * Handle /registernew command - Manually register current group
   */
  private async handleRegisterNewCommand(chatId: string, message: any): Promise<void> {
    try {
      // Check if this is the owner
      const fromId = message.from.id.toString();
      if (fromId !== this.ownerTelegramId) {
        await this.sendMessage(chatId, '❌ Only the bot owner can use this command.');
        return;
      }

      // Check if this is a group chat
      if (message.chat.type !== 'group' && message.chat.type !== 'supergroup') {
        await this.sendMessage(chatId, '❌ This command can only be used in group chats.');
        return;
      }

      const groupId = message.chat.id.toString();
      const groupName = message.chat.title || 'Unknown Group';

      console.log('[TelegramGroupBot] Manual registration requested for:', {
        groupId,
        groupName,
        requestedBy: fromId
      });

      // Check if group is already registered
      const existingGroup = await db.query.telegramGroups.findFirst({
        where: eq(telegramGroups.telegram_group_id, groupId)
      });

      if (existingGroup) {
        await this.sendMessage(chatId, `⚠️ This group is already registered!
        
📋 <b>Current Registration:</b>
• Group: ${existingGroup.group_name}
• Referral Code: <code>${existingGroup.referral_code}</code>
• Registration URL: https://evo-exchange.com/auth?ref=${existingGroup.referral_code}
• Status: ${existingGroup.is_active ? 'Active' : 'Inactive'}

Use /ref to see the referral information again.`);
        return;
      }

      await this.sendMessage(chatId, '🔄 Registering this group manually...');

      // Generate unique referral code
      let referralCode = '';
      let attempts = 0;
      const maxAttempts = 10;

      do {
        attempts++;
        referralCode = this.generateReferralCode();
        
        const existingCode = await db.query.telegramGroups.findFirst({
          where: eq(telegramGroups.referral_code, referralCode)
        });
        
        if (!existingCode) break;
        
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        await this.sendMessage(chatId, '❌ Failed to generate unique referral code. Please try again.');
        return;
      }

      console.log('[TelegramGroupBot] Generated referral code for manual registration:', {
        referralCode,
        attempts
      });

      // Insert into database
      const groupData = {
        telegram_group_id: groupId,
        group_name: groupName,
        referral_code: referralCode,
        owner_telegram_id: fromId,
        is_active: true,
        metadata: { 
          joined_at: new Date().toISOString(),
          registered_manually: true,
          registered_by: fromId
        }
      };

      console.log('[TelegramGroupBot] Inserting manually registered group:', groupData);

      await db.insert(telegramGroups).values(groupData);

      console.log('[TelegramGroupBot] Group manually registered successfully');

      // Send welcome message
      await this.sendMessage(chatId, '✅ Group registered successfully! Sending welcome message...');
      
      await this.sendWelcomeMessage(groupId, referralCode);

      await this.sendMessage(chatId, `🎉 <b>Manual Registration Complete!</b>

✅ Group successfully registered in EvokeEssence system
📋 Referral Code: <code>${referralCode}</code>
🌐 Registration URL: https://evo-exchange.com/auth?ref=${referralCode}

The welcome message has been sent to the group. All future registrations and activity will be tracked for this group.`);

      console.log('[TelegramGroupBot] Manual group registration completed:', {
        groupId,
        groupName,
        referralCode
      });

    } catch (error) {
      console.error('[TelegramGroupBot] Error in manual registration:', error);
      await this.sendMessage(chatId, '❌ Failed to register group manually. Please check logs and try again.');
    }
  }

  /**
   * Helper method to get user count for a referral code
   */
  private async getUserCount(referralCode: string): Promise<number> {
    try {
      const { users } = await import('@db/schema');
      const groupUsers = await db.query.users.findMany({
        where: eq(users.referralCode, referralCode)
      });
      return groupUsers.length;
    } catch (error) {
      console.error('[TelegramGroupBot] Error getting user count:', error);
      return 0;
    }
  }

  /**
   * Handle /help command
   */
  private async handleHelpCommand(chatId: string): Promise<void> {
    const message = `🤖 <b>EvokeEssence Bot Commands</b>

<b>Available Commands:</b>
/ref - Show referral link
/stats - Group statistics (all time)
/stats month - Enhanced monthly statistics
/registernew - Manually register current group (owner only)
/delete - Delete current group (requires confirmation)
/delete GROUP_ID - Delete specific group by ID (owner only)
/help - This help message
/groups - List all groups (owner only)
/reset GROUP_ID - Reset group referral code (owner only)
/kyc GROUP_ID - Get KYC status for group (owner only)
/transactions GROUP_ID - Get transaction details (owner only)
/ping - Test bot response (public)

<b>Delete Commands:</b>
• <code>/delete</code> - Delete the current group (requires /delete confirm)
• <code>/delete GROUP_ID</code> - Delete a specific group by ID (requires /delete GROUP_ID confirm)
• Both deletion methods include safety confirmations and detailed warnings

<b>New Features:</b>
• <code>/stats month</code> - Detailed monthly breakdown of registrations, KYC approvals, and transactions
• <code>/delete GROUP_ID</code> - Delete specific groups from anywhere using their ID

<b>Note:</b> Only authorized users can use bot commands.`;

    await this.sendMessage(chatId, message);
  }

  /**
   * Handle /groups command - list all groups
   */
  private async handleGroupsCommand(chatId: string): Promise<void> {
    try {
      const groups = await db.query.telegramGroups.findMany({
        where: eq(telegramGroups.is_active, true)
      });

      if (groups.length === 0) {
        await this.sendMessage(chatId, '📋 No active groups found.');
        return;
      }

      let message = `📋 <b>Active Groups (${groups.length})</b>\n\n`;
      
      for (const group of groups) {
        message += `🔹 <b>${group.group_name || 'Unnamed Group'}</b>\n`;
        message += `   ID: <code>${group.telegram_group_id}</code>\n`;
        message += `   Code: <code>${group.referral_code}</code>\n`;
        message += `   Added: ${group.created_at ? new Date(group.created_at).toLocaleDateString() : 'Unknown'}\n\n`;
      }

      await this.sendMessage(chatId, message);
    } catch (error) {
      console.error('[TelegramGroupBot] Error handling /groups command:', error);
      await this.sendMessage(chatId, '❌ Error retrieving groups list.');
    }
  }

  /**
   * Handle /reset command - reset group referral code
   */
  private async handleResetCommand(chatId: string, targetGroupId: string): Promise<void> {
    try {
      const group = await db.query.telegramGroups.findFirst({
        where: eq(telegramGroups.telegram_group_id, targetGroupId)
      });

      if (!group) {
        await this.sendMessage(chatId, '❌ Group not found.');
        return;
      }

      // Generate new referral code
      const newReferralCode = this.generateReferralCode();

      await db.update(telegramGroups)
        .set({ 
          referral_code: newReferralCode,
          updated_at: new Date()
        })
        .where(eq(telegramGroups.telegram_group_id, targetGroupId));

      await this.sendMessage(chatId, `✅ Referral code reset for group ${group.group_name || targetGroupId}
New code: <code>${newReferralCode}</code>`);

      // Notify the target group
      if (targetGroupId !== chatId) {
        await this.sendMessage(targetGroupId, `🔄 Your group's referral code has been reset.
New code: <code>${newReferralCode}</code>
New link: https://evo-exchange.com/auth?ref=${newReferralCode}`);
      }
    } catch (error) {
      console.error('[TelegramGroupBot] Error handling /reset command:', error);
      await this.sendMessage(chatId, '❌ Error resetting referral code.');
    }
  }

  /**
   * Send notification to group based on referral code
   */
  async sendNotificationToGroup(referralCode: string, message: string, notificationType: string, userId?: number): Promise<number | null> {
    try {
      console.log(`[TelegramGroupBot] DETAILED DEBUG - Looking for group with referral code: ${referralCode}`);
      
      // Find the group associated with this referral code
      const group = await db.query.telegramGroups.findFirst({
        where: and(
          eq(telegramGroups.referral_code, referralCode),
          eq(telegramGroups.is_active, true)
        )
      });

      console.log(`[TelegramGroupBot] DETAILED DEBUG - Group search result:`, group);

      if (!group) {
        console.log(`[TelegramGroupBot] No active group found for referral code: ${referralCode}`);
        return null;
      }

      console.log(`[TelegramGroupBot] DETAILED DEBUG - Found group:`, {
        id: group.id,
        name: group.group_name,
        telegram_group_id: group.telegram_group_id,
        referral_code: group.referral_code,
        is_active: group.is_active
      });

      // Log the notification
      await db.insert(telegramNotifications).values({
        group_id: group.id,
        user_id: userId,
        notification_type: notificationType,
        message: message,
        status: 'pending'
      });

      console.log(`[TelegramGroupBot] DETAILED DEBUG - About to send message to group ${group.telegram_group_id}`);
      console.log(`[TelegramGroupBot] DETAILED DEBUG - Message content:`, message);

      // Send the message
      const messageId = await this.sendMessage(group.telegram_group_id, message);

      console.log(`[TelegramGroupBot] DETAILED DEBUG - Message sent successfully, updating status`);

      // Update notification status
      await db.update(telegramNotifications)
        .set({ status: 'sent' })
        .where(and(
          eq(telegramNotifications.group_id, group.id),
          eq(telegramNotifications.status, 'pending')
        ));

      console.log(`[TelegramGroupBot] Notification sent to group ${group.telegram_group_id}`);
      return messageId;
    } catch (error) {
      console.error('[TelegramGroupBot] Error sending notification to group:', error);
      
      // Log the error
      if (error instanceof Error) {
        await db.update(telegramNotifications)
          .set({ 
            status: 'failed',
            error_message: error.message
          })
          .where(eq(telegramNotifications.status, 'pending'));
      }
    }
  }

  /**
   * Send a message to Telegram
   */
  private async sendMessage(chatId: string, text: string): Promise<number> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };

    console.log(`[TelegramGroupBot] DETAILED DEBUG - Sending message to ${chatId}:`, text);
    console.log(`[TelegramGroupBot] DETAILED DEBUG - Using bot token: ${this.botToken.substring(0, 10)}...`);

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log(`[TelegramGroupBot] DETAILED DEBUG - Telegram API response:`, response.data);

      if (!response.data.ok) {
        throw new Error(`Telegram API error: ${response.data.description}`);
      }
      
      console.log(`[TelegramGroupBot] DETAILED DEBUG - Message sent successfully to ${chatId}`);
      return response.data.result.message_id;
    } catch (error) {
      console.error('[TelegramGroupBot] Error sending message:', error);
      if (error.response) {
        console.error('[TelegramGroupBot] Response data:', error.response.data);
        console.error('[TelegramGroupBot] Response status:', error.response.status);
      }
      throw error;
    }
  }

  /**
   * Process webhook update
   */
  /**
   * Public method to handle updates (for webhook integration)
   */
  async handleUpdate(update: TelegramUpdate): Promise<void> {
    await this.processUpdate(update);
  }

  async processUpdate(update: TelegramUpdate): Promise<void> {
    try {
      // Ensure bot ID is available
      if (!this.botId) {
        const botInfo = await this.getMe();
        this.botId = botInfo.id;
        console.log('[TelegramGroupBot] Bot ID retrieved:', this.botId);
      }

      // Handle bot being added to a group - prioritize my_chat_member event
      if (update.my_chat_member) {
        const { chat, new_chat_member } = update.my_chat_member;
        
        if (new_chat_member.user.id === this.botId && 
            (new_chat_member.status === 'member' || new_chat_member.status === 'administrator') && 
            (chat.type === 'group' || chat.type === 'supergroup')) {
          console.log('[TelegramGroupBot] Bot added to group via my_chat_member event');
          await this.handleGroupJoin(chat.id.toString(), chat.title);
          return; // Exit early to prevent double processing
        }
      }

      // Only process messages if there's no my_chat_member event
      if (update.message && !update.my_chat_member) {
        // Check if bot was added via new_chat_members
        if (update.message.new_chat_members) {
          for (const member of update.message.new_chat_members) {
            if (member.id === this.botId) {
              console.log('[TelegramGroupBot] Bot added to group via new_chat_members event');
              await this.handleGroupJoin(
                update.message.chat.id.toString(),
                update.message.chat.title
              );
              return; // Exit after handling to prevent command processing
            }
          }
        }

        // Handle commands
        if (update.message.text && update.message.text.startsWith('/')) {
          await this.handleCommand(update);
        }
      }
    } catch (error) {
      console.error('[TelegramGroupBot] Error processing update:', error);
    }
  }

  /**
   * Start polling for updates (development mode)
   */
  private async startPolling(): Promise<void> {
    if (this.isPolling) {
      console.log('[TelegramGroupBot] Already polling, skipping...');
      return;
    }

    this.isPolling = true;
    console.log('[TelegramGroupBot] Starting polling...');
    
    const pollForUpdates = async () => {
      try {
        const url = `https://api.telegram.org/bot${this.botToken}/getUpdates`;
        const response = await axios.get(url, {
          params: {
            offset: this.lastUpdateId + 1,
            timeout: 30,
            limit: 100
          },
          timeout: 35000 // 35 second timeout
        });

        if (response.data.ok && response.data.result.length > 0) {
          for (const update of response.data.result) {
            this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
            await this.processUpdate(update);
          }
        }
      } catch (error: any) {
        if (error.response?.status === 409) {
          console.log('[TelegramGroupBot] Another instance is polling, stopping this one...');
          this.stopPolling();
          return;
        }
        
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          console.log('[TelegramGroupBot] Polling timeout (normal), continuing...');
        } else {
          console.error('[TelegramGroupBot] Polling error:', error.message);
        }
      }
      
      // Schedule next poll only if still polling
      if (this.isPolling) {
        this.pollingInterval = setTimeout(pollForUpdates, 1000);
      }
    };

    // Start the polling loop
    pollForUpdates();
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    this.isPolling = false;
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
      this.pollingInterval = null;
    }
    console.log('[TelegramGroupBot] Polling stopped');
  }

  /**
   * Clear webhook (for development mode)
   */
  private async clearWebhook(): Promise<void> {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/deleteWebhook`;
      await axios.post(url);
      console.log('[TelegramGroupBot] Webhook cleared');
    } catch (error) {
      console.error('[TelegramGroupBot] Failed to clear webhook:', error);
    }
  }

  /**
   * Start keep-alive mechanism to prevent Replit from sleeping
   */
  private startKeepAlive(): void {
    // Replit-specific keep-alive: ping every 4 minutes to stay under 5-minute timeout
    this.keepAliveInterval = setInterval(async () => {
      try {
        // Simple bot info check
        await this.getMe();
        console.log('[TelegramGroupBot] Keep-alive ping successful');
        
        // Also make a lightweight request to our own server to keep it active
        if (typeof global !== 'undefined' && global.process?.env?.REPLIT_DB_URL) {
          // We're on Replit, make a self-ping
          try {
            const selfPing = await axios.get('http://localhost:5000/health', {
              timeout: 3000
            });
            console.log('[TelegramGroupBot] Self-ping successful');
          } catch (error) {
            // Ignore self-ping errors, focus on bot health
          }
        }
      } catch (error) {
        console.error('[TelegramGroupBot] Keep-alive ping failed:', error);
        
        // If keep-alive fails, try to restart bot
        if (!this.isPolling) {
          console.log('[TelegramGroupBot] Attempting to restart bot after keep-alive failure...');
          setTimeout(() => {
            this.initialize().catch(console.error);
          }, 30000); // Retry after 30 seconds
        }
      }
    }, 4 * 60 * 1000); // 4 minutes
    
    console.log('[TelegramGroupBot] Keep-alive mechanism started (4min intervals)');
  }

  /**
   * Set webhook for production deployment (automatically detects production mode)
   */
  async setWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const response = await axios.post(`https://api.telegram.org/bot${this.botToken}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ['message', 'my_chat_member']
      });

      if (response.data.ok) {
        console.log('[TelegramGroupBot] Webhook set successfully:', webhookUrl);
        return true;
      } else {
        console.error('[TelegramGroupBot] Failed to set webhook:', response.data);
        return false;
      }
    } catch (error) {
      console.error('[TelegramGroupBot] Error setting webhook:', error);
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    console.log('[TelegramGroupBot] Cleaning up...');
    this.stopPolling();
    
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  /**
   * Handle /ping command - Test if bot is online
   */
  private async handlePingCommand(chatId: string): Promise<void> {
    const message = `🏓 <b>Pong!</b>

✅ Bot is online and responding
⏰ Time: ${new Date().toLocaleString('en-US', { timeZone: 'UTC' })} UTC
🤖 Version: 1.0.0`;

    await this.sendMessage(chatId, message);
  }

  /**
   * Handle /kyc command - List verified users from a group
   */
  private async handleKycCommand(chatId: string, groupId: string): Promise<void> {
    try {
      // Find the group by ID
      const group = await db.query.telegramGroups.findFirst({
        where: eq(telegramGroups.telegram_group_id, groupId)
      });

      if (!group) {
        await this.sendMessage(chatId, '❌ Group not found.');
        return;
      }

      // Find all users registered with this referral code
      const { users } = await import('@db/schema');
      const registeredUsers = await db.query.users.findMany({
        where: eq(users.referral_code, group.referral_code)
      });

      if (registeredUsers.length === 0) {
        await this.sendMessage(chatId, `📋 No users registered from group ${groupId} yet.`);
        return;
      }

      // Filter for verified users
      const verifiedUsers = registeredUsers.filter(user => user.kyc_status === 'verified');

      if (verifiedUsers.length === 0) {
        await this.sendMessage(chatId, `📋 No verified users from group ${groupId} yet.`);
        return;
      }

      // Build the message
      let message = `✅ <b>Verified Users from Group ${groupId}</b>\n\n`;
      message += `📋 <b>Referral Code:</b> <code>${group.referral_code}</code>\n`;
      message += `👥 <b>Total Verified:</b> ${verifiedUsers.length}\n\n`;

      verifiedUsers.forEach((user, index) => {
        message += `${index + 1}. ${user.full_name || 'N/A'} (${user.email})\n`;
        message += `   ID: ${user.id} | Verified: ${user.kyc_approved_at ? new Date(user.kyc_approved_at).toLocaleDateString() : 'N/A'}\n\n`;
      });

      await this.sendMessage(chatId, message);
    } catch (error) {
      console.error('[TelegramGroupBot] Error handling /kyc command:', error);
      await this.sendMessage(chatId, '❌ Error retrieving KYC information.');
    }
  }

  /**
   * Handle /transactions command - Show recent transactions from a group
   */
  private async handleTransactionsCommand(chatId: string, groupId: string): Promise<void> {
    try {
      // Find the group by ID
      const group = await db.query.telegramGroups.findFirst({
        where: eq(telegramGroups.telegram_group_id, groupId)
      });

      if (!group) {
        await this.sendMessage(chatId, '❌ Group not found.');
        return;
      }

      // Find all users registered with this referral code
      const { users } = await import('@db/schema');
      const registeredUsers = await db.query.users.findMany({
        where: eq(users.referral_code, group.referral_code)
      });

      if (registeredUsers.length === 0) {
        await this.sendMessage(chatId, `📋 No users registered from group ${groupId} yet.`);
        return;
      }

      const userIds = registeredUsers.map(u => u.id);

      // Import necessary schemas
      const { inArray, desc } = await import('drizzle-orm');
      const { sepaDeposits, usdtOrders, usdcOrders } = await import('@db/schema');
      
      // Get recent transactions (last 10)
      const recentSepa = await db.query.sepaDeposits.findMany({
        where: inArray(sepaDeposits.userId, userIds),
        orderBy: desc(sepaDeposits.createdAt),
        limit: 10
      });
      
      const recentUsdt = await db.query.usdtOrders.findMany({
        where: inArray(usdtOrders.userId, userIds),
        orderBy: desc(usdtOrders.createdAt),
        limit: 10
      });
      
      const recentUsdc = await db.query.usdcOrders.findMany({
        where: inArray(usdcOrders.userId, userIds),
        orderBy: desc(usdcOrders.createdAt),
        limit: 10
      });

      // Combine and sort all transactions
      const allTransactions = [
        ...recentSepa.map(t => ({ ...t, type: 'SEPA', created_at: t.createdAt })),
        ...recentUsdt.map(t => ({ ...t, type: 'USDT', created_at: t.createdAt })),
        ...recentUsdc.map(t => ({ ...t, type: 'USDC', created_at: t.createdAt }))
      ].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      }).slice(0, 10);

      if (allTransactions.length === 0) {
        await this.sendMessage(chatId, `📋 No transactions from group ${groupId} yet.`);
        return;
      }

      // Build the message
      let message = `💳 <b>Recent Transactions from Group ${groupId}</b>\n\n`;
      message += `📋 <b>Referral Code:</b> <code>${group.referral_code}</code>\n\n`;

      allTransactions.forEach((tx, index) => {
        const txDate = tx.created_at ? new Date(tx.created_at) : new Date();
        const date = txDate.toLocaleDateString();
        const time = txDate.toLocaleTimeString();
        
        if (tx.type === 'SEPA') {
          const status = tx.status === 'completed' ? '✅' : tx.status === 'pending' ? '⏳' : '❌';
          const amount = (tx as any).amount || '0';
          message += `${index + 1}. ${status} SEPA €${amount}\n`;
          message += `   User ID: ${tx.userId} | ${date} ${time}\n\n`;
        } else if (tx.type === 'USDT') {
          const status = tx.status === 'completed' ? '✅' : tx.status === 'processing' ? '⏳' : '❌';
          const amount = (tx as any).amountUsdt || (tx as any).amountUsd || '0';
          message += `${index + 1}. ${status} USDT ${amount}\n`;
          message += `   User ID: ${tx.userId} | ${date} ${time}\n\n`;
        } else if (tx.type === 'USDC') {
          const status = tx.status === 'completed' ? '✅' : tx.status === 'processing' ? '⏳' : '❌';
          const amount = (tx as any).amountUsdc || (tx as any).amountUsd || '0';
          message += `${index + 1}. ${status} USDC ${amount}\n`;
          message += `   User ID: ${tx.userId} | ${date} ${time}\n\n`;
        }
      });

      await this.sendMessage(chatId, message);
    } catch (error) {
      console.error('[TelegramGroupBot] Error handling /transactions command:', error);
      await this.sendMessage(chatId, '❌ Error retrieving transaction information.');
    }
  }
}

// Singleton instance
let botInstance: TelegramGroupBot | null = null;

export const telegramGroupBot = (() => {
  if (!botInstance) {
    botInstance = new TelegramGroupBot();
  }
  return botInstance;
})();

export default telegramGroupBot;