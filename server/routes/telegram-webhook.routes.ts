import { Router, Request, Response } from 'express';
import express from 'express';
import { TelegramWebhookService } from '../services/telegram-webhook.js';

const router = Router();

// CRITICAL: Add JSON body parsing specifically for webhook route
// This is needed because webhook routes are registered before global JSON middleware
router.use(express.json({ limit: '10mb' }));
router.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Webhook endpoint for Telegram bot updates (with bot token in URL)
 * This matches the format used by the bot: /api/telegram/webhook/BOT_TOKEN
 * IMPORTANT: This endpoint must be publicly accessible (no auth required)
 */
router.post('/telegram/webhook/:botToken', async (req: Request, res: Response) => {
  try {
    const { botToken } = req.params;
    console.log('[TelegramWebhook] Received webhook with bot token:', {
      botToken: botToken.substring(0, 10) + '...', // Log only part of token for security
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      updateId: req.body?.update_id,
      messageText: req.body?.message?.text,
      chatId: req.body?.message?.chat?.id,
      fromId: req.body?.message?.from?.id
    });

    const update = req.body;
    
    // Basic validation - Telegram sends objects
    if (!update || typeof update !== 'object') {
      console.log('[TelegramWebhook] Invalid update format - not an object');
      return res.status(200).json({ ok: true, message: 'No valid update' });
    }

    // Log detailed update structure for debugging
    console.log('[TelegramWebhook] Detailed update structure:', JSON.stringify(update, null, 2));

    // Handle test requests
    if (update.test === true) {
      console.log('[TelegramWebhook] Test request received - responding OK');
      return res.status(200).json({ ok: true, message: 'Test successful', timestamp: new Date().toISOString() });
    }

    // Process all updates - handle both real Telegram updates and direct API calls
    console.log('[TelegramWebhook] Processing update...');
    const result = await TelegramWebhookService.handleWebhook(update);
    console.log('[TelegramWebhook] Update processing completed:', result ? 'success' : 'no action needed');
    
    // Always respond with 200 OK for Telegram
    res.status(200).json({ 
      ok: true, 
      timestamp: new Date().toISOString(),
      processed: true 
    });
    
  } catch (error) {
    console.error('[TelegramWebhook] Error processing webhook:', error);
    // Always return 200 to prevent Telegram from retrying failed requests
    res.status(200).json({ 
      ok: true, 
      error: 'processed',
      timestamp: new Date().toISOString() 
    });
  }
});

/**
 * Webhook endpoint for Telegram bot updates (standard format)
 * This is for production deployment on Cloudflare
 * IMPORTANT: This endpoint must be publicly accessible (no auth required)
 */
router.post('/webhook/telegram', async (req: Request, res: Response) => {
  try {
    console.log('[TelegramWebhook] Received webhook:', {
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      contentType: req.get('Content-Type'),
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      updateId: req.body?.update_id,
      messageText: req.body?.message?.text,
      chatId: req.body?.message?.chat?.id,
      fromId: req.body?.message?.from?.id
    });

    const update = req.body;
    
    // Basic validation - Telegram sends objects
    if (!update || typeof update !== 'object') {
      console.log('[TelegramWebhook] Invalid update format - not an object');
      return res.status(200).json({ ok: true, message: 'No valid update' });
    }

    // Log detailed update structure for debugging
    console.log('[TelegramWebhook] Detailed update structure:', JSON.stringify(update, null, 2));

    // Handle test requests
    if (update.test === true) {
      console.log('[TelegramWebhook] Test request received - responding OK');
      return res.status(200).json({ ok: true, message: 'Test successful', timestamp: new Date().toISOString() });
    }

    // Process all updates - handle both real Telegram updates and direct API calls
    console.log('[TelegramWebhook] Processing update...');
    const result = await TelegramWebhookService.handleWebhook(update);
    console.log('[TelegramWebhook] Update processing completed:', result ? 'success' : 'no action needed');
    
    // Always respond with 200 OK for Telegram
    res.status(200).json({ 
      ok: true, 
      timestamp: new Date().toISOString(),
      processed: true 
    });
    
  } catch (error) {
    console.error('[TelegramWebhook] Error processing webhook:', error);
    // Always return 200 to prevent Telegram from retrying failed requests
    res.status(200).json({ 
      ok: true, 
      error: 'processed',
      timestamp: new Date().toISOString() 
    });
  }
});

/**
 * Set webhook URL (for production deployment)
 */
router.post('/webhook/telegram/set', async (req: Request, res: Response) => {
  try {
    const { webhookUrl } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl is required' });
    }

    const success = await TelegramWebhookService.setWebhook(webhookUrl);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Webhook set successfully',
        webhookUrl 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to set webhook' 
      });
    }
  } catch (error) {
    console.error('[TelegramWebhook] Error setting webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Remove webhook (switch back to polling)
 */
router.delete('/webhook/telegram', async (req: Request, res: Response) => {
  try {
    const success = await TelegramWebhookService.deleteWebhook();
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'Webhook deleted successfully' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: 'Failed to delete webhook' 
      });
    }
  } catch (error) {
    console.error('[TelegramWebhook] Error deleting webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Get current webhook information
 */
router.get('/webhook/telegram/info', async (req: Request, res: Response) => {
  try {
    const info = await TelegramWebhookService.getWebhookInfo();
    res.json(info);
  } catch (error) {
    console.error('[TelegramWebhook] Error getting webhook info:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Debug endpoint to test body parsing
router.post('/webhook/telegram/test', (req: Request, res: Response) => {
  console.log('[TelegramWebhook] Test endpoint - body received:', {
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    body: req.body,
    contentType: req.get('Content-Type')
  });
  
  res.json({
    success: true,
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

export default router;