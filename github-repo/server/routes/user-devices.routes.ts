import express, { Request, Response } from "express";
import { db } from "../../db";
import { userSessions, insertUserSessionSchema } from "../../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuthentication } from "../middleware/auth";
import { v4 as uuidv4 } from "uuid";

/**
 * User Devices API Routes
 * 
 * These routes allow users to manage their device sessions, particularly useful for iOS app integration.
 */

const router = express.Router();

// Schema for device registration request
const registerDeviceSchema = z.object({
  deviceId: z.string(),
  deviceName: z.string().optional(),
  model: z.string(),
  os: z.string(),
  osVersion: z.string(),
  appVersion: z.string(),
  pushToken: z.string().optional(),
  locale: z.string().optional(),
  timeZone: z.string().optional(),
  carrier: z.string().optional()
});

// Schema for device rename request
const renameDeviceSchema = z.object({
  deviceName: z.string()
});

// Get all user devices
router.get('/', requireAuthentication, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'You must be logged in to view your devices'
      });
    }
    
    // Get all sessions for the user
    const sessions = await db.query.userSessions.findMany({
      where: eq(userSessions.user_id, userId),
      orderBy: [desc(userSessions.last_active_at)]
    });
    
    // Format device data for response
    const devices = sessions.map(session => ({
      id: session.id,
      deviceId: session.device_id,
      deviceName: session.device_name || session.device_model,
      deviceModel: session.device_model,
      os: session.device_os,
      osVersion: session.device_os_version,
      lastActive: session.last_active_at,
      createdAt: session.created_at,
      isCurrentDevice: session.session_id === req.sessionID
    }));
    
    res.json({
      success: true,
      data: devices
    });
  } catch (error) {
    console.error('[User Devices] Error getting devices:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get user devices'
    });
  }
});

// Get current device info
router.get('/current', requireAuthentication, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'You must be logged in to view your current device'
      });
    }
    
    // Look up the current session
    const session = await db.query.userSessions.findFirst({
      where: and(
        eq(userSessions.user_id, userId),
        eq(userSessions.session_id, req.sessionID)
      )
    });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Current device session not found'
      });
    }
    
    // Return device info
    res.json({
      success: true,
      data: {
        id: session.id,
        deviceId: session.device_id,
        deviceName: session.device_name || session.device_model,
        deviceModel: session.device_model,
        os: session.device_os,
        osVersion: session.device_os_version,
        lastActive: session.last_active_at,
        createdAt: session.created_at,
        isCurrentDevice: true
      }
    });
  } catch (error) {
    console.error('[User Devices] Error getting current device:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get current device information'
    });
  }
});

// Register a new device or update existing one
router.post('/register', requireAuthentication, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'You must be logged in to register a device'
      });
    }
    
    // Validate request body
    const validationResult = registerDeviceSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid device information',
        issues: validationResult.error.issues
      });
    }
    
    const deviceData = validationResult.data;
    
    // Check if device already exists for this user
    const existingDevice = await db.query.userSessions.findFirst({
      where: and(
        eq(userSessions.user_id, userId),
        eq(userSessions.device_id, deviceData.deviceId)
      )
    });
    
    if (existingDevice) {
      // Update existing device
      await db.update(userSessions)
        .set({
          device_name: deviceData.deviceName || existingDevice.device_name,
          device_os: deviceData.os,
          device_os_version: deviceData.osVersion,
          app_version: deviceData.appVersion,
          push_token: deviceData.pushToken || existingDevice.push_token,
          device_locale: deviceData.locale || existingDevice.device_locale,
          device_timezone: deviceData.timeZone || existingDevice.device_timezone,
          device_carrier: deviceData.carrier || existingDevice.device_carrier,
          last_active_at: new Date(),
          session_id: req.sessionID || existingDevice.session_id
        })
        .where(eq(userSessions.id, existingDevice.id));
      
      return res.json({
        success: true,
        data: {
          id: existingDevice.id,
          deviceId: existingDevice.device_id,
          message: 'Device updated successfully'
        }
      });
    }
    
    // Create new device entry
    const newSession = await db.insert(userSessions)
      .values({
        user_id: userId,
        device_id: deviceData.deviceId,
        device_name: deviceData.deviceName || null,
        device_model: deviceData.model,
        device_os: deviceData.os,
        device_os_version: deviceData.osVersion,
        app_version: deviceData.appVersion,
        push_token: deviceData.pushToken || null,
        device_locale: deviceData.locale || null,
        device_timezone: deviceData.timeZone || null,
        device_carrier: deviceData.carrier || null,
        session_id: req.sessionID,
        created_at: new Date(),
        last_active_at: new Date()
      })
      .returning();
    
    res.status(201).json({
      success: true,
      data: {
        id: newSession[0].id,
        deviceId: newSession[0].device_id,
        message: 'Device registered successfully'
      }
    });
  } catch (error) {
    console.error('[User Devices] Error registering device:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to register device'
    });
  }
});

// Rename a device
router.put('/:id/rename', requireAuthentication, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'You must be logged in to rename a device'
      });
    }
    
    const deviceId = parseInt(req.params.id);
    if (isNaN(deviceId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid device ID'
      });
    }
    
    // Validate request body
    const validationResult = renameDeviceSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid device name',
        issues: validationResult.error.issues
      });
    }
    
    const { deviceName } = validationResult.data;
    
    // Check if device exists and belongs to user
    const device = await db.query.userSessions.findFirst({
      where: and(
        eq(userSessions.id, deviceId),
        eq(userSessions.user_id, userId)
      )
    });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Device not found or does not belong to you'
      });
    }
    
    // Update device name
    await db.update(userSessions)
      .set({
        device_name: deviceName,
        last_active_at: new Date()
      })
      .where(eq(userSessions.id, deviceId));
    
    res.json({
      success: true,
      data: {
        id: deviceId,
        deviceName: deviceName,
        message: 'Device renamed successfully'
      }
    });
  } catch (error) {
    console.error('[User Devices] Error renaming device:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to rename device'
    });
  }
});

// Remove a device
router.delete('/:id/remove', requireAuthentication, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'You must be logged in to remove a device'
      });
    }
    
    const deviceId = parseInt(req.params.id);
    if (isNaN(deviceId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid device ID'
      });
    }
    
    // Check if device exists and belongs to user
    const device = await db.query.userSessions.findFirst({
      where: and(
        eq(userSessions.id, deviceId),
        eq(userSessions.user_id, userId)
      )
    });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Device not found or does not belong to you'
      });
    }
    
    // Check if trying to remove current device
    if (device.session_id === req.sessionID) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Cannot remove current device. Please use logout instead.'
      });
    }
    
    // Delete the device
    await db.delete(userSessions)
      .where(eq(userSessions.id, deviceId));
    
    res.json({
      success: true,
      data: {
        id: deviceId,
        message: 'Device removed successfully'
      }
    });
  } catch (error) {
    console.error('[User Devices] Error removing device:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to remove device'
    });
  }
});

export const registerUserDevicesRoutes = (app: express.Express): void => {
  app.use('/api/user/devices', router);
  console.log('User Devices routes registered');
};

export default router;