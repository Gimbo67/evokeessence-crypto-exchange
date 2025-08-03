import { Router } from 'express';
import { telegramService } from '../services/telegram';
import { requireAdmin } from '../middleware/admin';

const router = Router();

// Test endpoint to verify Telegram bot functionality
router.post('/api/admin/telegram/test', requireAdmin, async (req, res) => {
  try {
    console.log('[Telegram Test] Admin testing Telegram bots...');
    
    // Test both bots
    const testResults = await telegramService.testBots();
    
    console.log('[Telegram Test] Test results:', testResults);
    
    res.json({
      success: true,
      results: testResults,
      message: 'Telegram bot test completed'
    });
  } catch (error) {
    console.error('[Telegram Test] Error testing bots:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test Telegram bots',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test endpoint to send a sample registration notification
router.post('/api/admin/telegram/test-registration', requireAdmin, async (req, res) => {
  try {
    console.log('[Telegram Test] Testing registration notification...');
    
    const testMessage = telegramService.formatUserRegistration(
      'test_user',
      'Test User',
      'test@example.com',
      'TEST123'
    );
    
    await telegramService.sendRegistrationNotification(testMessage);
    
    res.json({
      success: true,
      message: 'Test registration notification sent'
    });
  } catch (error) {
    console.error('[Telegram Test] Error sending test registration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test registration notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test endpoint to send a sample transaction notification
router.post('/api/admin/telegram/test-transaction', requireAdmin, async (req, res) => {
  try {
    console.log('[Telegram Test] Testing transaction notification...');
    
    const testMessage = telegramService.formatTransaction(
      'SEPA',
      1000,
      'EUR',
      'test_user',
      'Test User',
      undefined,
      'TEST-REF-123'
    );
    
    await telegramService.sendTransactionNotification(testMessage);
    
    res.json({
      success: true,
      message: 'Test transaction notification sent'
    });
  } catch (error) {
    console.error('[Telegram Test] Error sending test transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test transaction notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test endpoint to send a sample KYC verification notification
router.post('/api/admin/telegram/test-kyc', requireAdmin, async (req, res) => {
  try {
    console.log('[Telegram Test] Testing KYC verification notification...');
    
    const testMessage = telegramService.formatKycVerification(
      'test_user',
      'Test User',
      'approved'
    );
    
    await telegramService.sendRegistrationNotification(testMessage);
    
    res.json({
      success: true,
      message: 'Test KYC verification notification sent'
    });
  } catch (error) {
    console.error('[Telegram Test] Error sending test KYC:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test KYC verification notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;