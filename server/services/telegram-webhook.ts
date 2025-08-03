import { telegramGroupBot } from './telegram-group-bot.js';

/**
 * Webhook handler for Telegram bot
 * This replaces polling for production deployment on Cloudflare
 */
export class TelegramWebhookService {
  /**
   * Handle incoming webhook from Telegram
   */
  static async handleWebhook(update: any): Promise<boolean> {
    try {
      console.log('[TelegramWebhook] Received update:', {
        updateId: update.update_id,
        type: update.message ? 'message' : update.my_chat_member ? 'chat_member' : 'other',
        messageText: update.message?.text,
        chatId: update.message?.chat?.id,
        fromId: update.message?.from?.id,
        timestamp: new Date().toISOString()
      });

      // Process the update using existing bot logic
      console.log('[TelegramWebhook] Processing update with telegramGroupBot...');
      await telegramGroupBot.handleUpdate(update);
      console.log('[TelegramWebhook] Update processed successfully');
      return true;
      
    } catch (error) {
      console.error('[TelegramWebhook] Error processing update:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        update: update,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Set webhook URL for the bot
   */
  static async setWebhook(webhookUrl: string): Promise<boolean> {
    try {
      const botToken = process.env.TELEGRAM_GROUP_BOT_TOKEN || '7871836109:AAHu4uHUol80kN-iWzkpgdZRkMm8_ySAMx4';
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'my_chat_member']
        })
      });

      const result = await response.json();
      
      if (result.ok) {
        console.log('[TelegramWebhook] Webhook set successfully:', webhookUrl);
        return true;
      } else {
        console.error('[TelegramWebhook] Failed to set webhook:', result);
        return false;
      }
    } catch (error) {
      console.error('[TelegramWebhook] Error setting webhook:', error);
      return false;
    }
  }

  /**
   * Remove webhook (switch back to polling)
   */
  static async deleteWebhook(): Promise<boolean> {
    try {
      const botToken = process.env.TELEGRAM_GROUP_BOT_TOKEN || '7871836109:AAHu4uHUol80kN-iWzkpgdZRkMm8_ySAMx4';
      const response = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
        method: 'POST'
      });

      const result = await response.json();
      
      if (result.ok) {
        console.log('[TelegramWebhook] Webhook deleted successfully');
        return true;
      } else {
        console.error('[TelegramWebhook] Failed to delete webhook:', result);
        return false;
      }
    } catch (error) {
      console.error('[TelegramWebhook] Error deleting webhook:', error);
      return false;
    }
  }

  /**
   * Get current webhook info
   */
  static async getWebhookInfo(): Promise<any> {
    try {
      const botToken = process.env.TELEGRAM_GROUP_BOT_TOKEN || '7871836109:AAHu4uHUol80kN-iWzkpgdZRkMm8_ySAMx4';
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const result = await response.json();
      
      console.log('[TelegramWebhook] Current webhook info:', result);
      return result;
    } catch (error) {
      console.error('[TelegramWebhook] Error getting webhook info:', error);
      return null;
    }
  }
}

export default TelegramWebhookService;