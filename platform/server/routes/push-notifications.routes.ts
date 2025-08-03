import express, { Request, Response } from 'express';
import { db } from '../../db';
import { userSessions } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import pushService from '../services/push';
import { z } from 'zod';
import { isAuthenticated } from '../middleware/auth.middleware';
import { isIOSApp } from '../middleware/app.middleware';

const router = express.Router();

// Schema for updating device token
const updateTokenSchema = z.object({
  deviceToken: z.string().min(10).max(255),
  deviceId: z.string().uuid()
});

// Schema for toggling notifications
const toggleNotificationsSchema = z.object({
  enabled: z.boolean(),
  deviceId: z.string().uuid()
});

/**
 * Update push token for a device
 * @route POST /api/push-notifications/update-token
 * @param {string} deviceToken - The APNs device token
 * @param {string} deviceId - The unique device identifier
 * @access Private
 */
router.post('/update-token', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = updateTokenSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const { deviceToken, deviceId } = validationResult.data;
    const userId = req.user!.id;
    
    // Find the user session with this device ID
    const existingSession = await db.select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.user_id, userId),
          eq(userSessions.device_id, deviceId)
        )
      )
      .limit(1);
    
    if (existingSession.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found. Please register the device first.'
      });
    }
    
    // Update push token for this device
    await db.update(userSessions)
      .set({
        push_token: deviceToken,
        device_os: 'iOS' // Since this is for APNs, we know it's iOS
      })
      .where(
        and(
          eq(userSessions.user_id, userId),
          eq(userSessions.device_id, deviceId)
        )
      );
    
    console.log(`Push token updated for user ${userId}, device ${deviceId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Push notification token updated successfully'
    });
  } catch (error) {
    console.error('Error updating push token:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating push token'
    });
  }
});

/**
 * Toggle push notifications for a device
 * @route POST /api/push-notifications/toggle
 * @param {boolean} enabled - Whether to enable or disable notifications
 * @param {string} deviceId - The unique device identifier
 * @access Private
 */
router.post('/toggle', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = toggleNotificationsSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const { enabled, deviceId } = validationResult.data;
    const userId = req.user!.id;
    
    // Find the user session with this device ID
    const existingSession = await db.select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.user_id, userId),
          eq(userSessions.device_id, deviceId)
        )
      )
      .limit(1);
    
    if (existingSession.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Device not found. Please register the device first.'
      });
    }
    
    // Update notifications_enabled for this device
    await db.update(userSessions)
      .set({
        notifications_enabled: enabled
      })
      .where(
        and(
          eq(userSessions.user_id, userId),
          eq(userSessions.device_id, deviceId)
        )
      );
    
    const statusText = enabled ? 'enabled' : 'disabled';
    console.log(`Push notifications ${statusText} for user ${userId}, device ${deviceId}`);
    
    return res.status(200).json({
      success: true,
      message: `Push notifications ${statusText} successfully`
    });
  } catch (error) {
    console.error('Error toggling push notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error toggling push notifications'
    });
  }
});

/**
 * Get notification settings for user's devices
 * @route GET /api/push-notifications/settings
 * @access Private
 */
router.get('/settings', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Get all user's devices with notification settings
    const userDevices = await db.select({
      deviceId: userSessions.device_id,
      deviceName: userSessions.device_name,
      deviceOs: userSessions.device_os,
      notificationsEnabled: userSessions.notifications_enabled,
      pushToken: userSessions.push_token
    })
    .from(userSessions)
    .where(eq(userSessions.user_id, userId));
    
    // Map to include derived values that can't be directly selected in SQL
    const devices = userDevices.map(device => ({
      ...device,
      hasPushToken: device.pushToken ? true : false
    }));
    
    return res.status(200).json({
      success: true,
      devices: devices
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching notification settings'
    });
  }
});

/**
 * Send a test notification to user's devices
 * @route POST /api/push-notifications/test
 * @access Private
 */
router.post('/test', isAuthenticated, isIOSApp, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Send a test notification
    const result = await pushService.sendTestNotification(userId);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: `Test notification sent successfully to ${result.sent} device(s)`,
        sent: result.sent,
        failed: result.failed
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No devices found with push tokens or notifications disabled',
        sent: result.sent,
        failed: result.failed
      });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error sending test notification'
    });
  }
});

// Wrapper function for the route registration
export function registerPushNotificationRoutes(app: express.Express) {
  app.use('/api/push-notifications', router);
  console.log('Push notification routes registered');
}

export default router;