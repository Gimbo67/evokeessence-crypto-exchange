import axios from 'axios';

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
}

class TelegramService {
  private registrationBotToken: string;
  private transactionBotToken: string;
  private registrationChatId: string;
  private transactionChatId: string;

  constructor() {
    this.registrationBotToken = '7812448148:AAEkcDEO-XIsqDM2MnpTZ5-OICs_85JqTHY';
    this.transactionBotToken = '7750607634:AAGQQkN-nxJFvYJdXg_XVvsSm8EWJagG8yk';
    this.registrationChatId = '-4831579002';
    this.transactionChatId = '-4883007793';
  }

  /**
   * Send a message using the registration bot
   */
  async sendRegistrationNotification(message: string): Promise<void> {
    try {
      await this.sendMessage(this.registrationBotToken, this.registrationChatId, message);
      console.log('[Telegram] Registration notification sent successfully');
    } catch (error) {
      console.error('[Telegram] Failed to send registration notification:', error);
    }
  }

  /**
   * Send a message using the transaction bot
   */
  async sendTransactionNotification(message: string): Promise<void> {
    try {
      console.log('🔔 [TELEGRAM SERVICE] Sending transaction notification to chat:', this.transactionChatId);
      console.log('🔔 [TELEGRAM SERVICE] Message preview:', message.substring(0, 100) + '...');
      
      await this.sendMessage(this.transactionBotToken, this.transactionChatId, message);
      console.log('✅ [TELEGRAM SERVICE] Transaction notification sent successfully');
    } catch (error) {
      console.error('❌ [TELEGRAM SERVICE] Failed to send transaction notification:', error);
      throw error; // Re-throw to allow calling code to handle the error
    }
  }

  /**
   * Generic method to send a message to Telegram
   */
  private async sendMessage(botToken: string, chatId: string, text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const payload: TelegramMessage = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 seconds timeout
    });

    if (!response.data.ok) {
      throw new Error(`Telegram API error: ${response.data.description}`);
    }
  }

  /**
   * Format user registration notification
   */
  formatUserRegistration(username: string, fullName: string, email: string, referralCode?: string): string {
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'Europe/Prague',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    let message = `🔔 <b>New User Registration</b>\n\n`;
    message += `👤 <b>Username:</b> ${username}\n`;
    message += `📝 <b>Full Name:</b> ${fullName}\n`;
    message += `📧 <b>Email:</b> ${email}\n`;
    
    if (referralCode) {
      message += `🎯 <b>Referral Code:</b> ${referralCode}\n`;
    }
    
    message += `⏰ <b>Time:</b> ${timestamp}\n`;
    message += `🌐 <b>Platform:</b> EvokeEssence`;

    return message;
  }

  /**
   * Format KYC verification notification
   */
  formatKycVerification(username: string, fullName: string, status: string): string {
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'Europe/Prague',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const statusIcon = status === 'approved' ? '✅' : status === 'rejected' ? '❌' : '⏳';
    const statusText = status === 'approved' ? 'APPROVED' : status === 'rejected' ? 'REJECTED' : 'PENDING';

    let message = `${statusIcon} <b>KYC Verification ${statusText}</b>\n\n`;
    message += `👤 <b>Username:</b> ${username}\n`;
    message += `📝 <b>Full Name:</b> ${fullName}\n`;
    message += `📋 <b>Status:</b> ${statusText}\n`;
    message += `⏰ <b>Time:</b> ${timestamp}\n`;
    message += `🌐 <b>Platform:</b> EvokeEssence`;

    return message;
  }

  /**
   * Format transaction notification with detailed breakdown
   */
  formatTransaction(
    type: 'SEPA' | 'USDT' | 'USDC',
    finalAmount: number,
    currency: string,
    username: string,
    fullName: string,
    txHash?: string,
    reference?: string,
    initialAmount?: number,
    commission?: number
  ): string {
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'Europe/Prague',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    const typeIcon = type === 'SEPA' ? '🏦' : '₿';
    const typeText = type === 'SEPA' ? 'SEPA Deposit' : `${type} Transaction`;

    let message = `${typeIcon} <b>${typeText}</b>\n\n`;
    message += `👤 <b>Username:</b> ${username}\n`;
    message += `📝 <b>Full Name:</b> ${fullName}\n`;
    message += `💳 <b>Type:</b> ${type === 'SEPA' ? 'Bank Transfer' : 'Cryptocurrency'}\n\n`;
    
    // Add detailed amount breakdown if available
    if (initialAmount && commission) {
      message += `💰 <b>Amount Breakdown:</b>\n`;
      message += `  ├ Initial Amount: ${initialAmount.toLocaleString()} ${currency}\n`;
      message += `  ├ Commission: -${commission.toLocaleString()} ${currency}\n`;
      message += `  └ <b>Final Amount: ${finalAmount.toLocaleString()} ${currency}</b>\n`;
    } else {
      message += `💰 <b>Amount:</b> ${finalAmount.toLocaleString()} ${currency}\n`;
    }
    
    if (txHash) {
      message += `🔗 <b>TX Hash:</b> <code>${txHash}</code>\n`;
    }
    
    if (reference) {
      message += `📋 <b>Reference:</b> ${reference}\n`;
    }
    
    message += `⏰ <b>Time:</b> ${timestamp}\n`;
    message += `🌐 <b>Platform:</b> EvokeEssence`;

    return message;
  }

  /**
   * Test the bots by sending a test message
   */
  async testBots(): Promise<{ registration: boolean; transaction: boolean }> {
    const testMessage = `🔧 <b>Bot Test</b>\n\nThis is a test message from EvokeEssence platform.\n⏰ ${new Date().toLocaleString('en-US', { timeZone: 'Europe/Prague' })}`;
    
    let registrationTest = false;
    let transactionTest = false;

    try {
      await this.sendRegistrationNotification(testMessage);
      registrationTest = true;
    } catch (error) {
      console.error('[Telegram] Registration bot test failed:', error);
    }

    try {
      await this.sendTransactionNotification(testMessage);
      transactionTest = true;
    } catch (error) {
      console.error('[Telegram] Transaction bot test failed:', error);
    }

    return { registration: registrationTest, transaction: transactionTest };
  }
}

export const telegramService = new TelegramService();
export default telegramService;