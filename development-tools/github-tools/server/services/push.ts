import { Provider, Notification } from 'apn';
import { db } from '../../db';
import { userSessions } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';

// Define interface for push notification options
interface PushNotificationOptions {
  title: string;
  body: string;
  badge?: number;
  sound?: string;
  data?: Record<string, any>;
  category?: string;
  type?: string;
  expiry?: number; // Seconds
  priority?: 5 | 10; // 5 = low, 10 = high
}

// Singleton service for Apple Push Notifications
class ApplePushService {
  private static instance: ApplePushService;
  private provider: Provider | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  
  private constructor() {}
  
  /**
   * Get the singleton instance of the Apple Push Service
   */
  public static getInstance(): ApplePushService {
    if (!ApplePushService.instance) {
      ApplePushService.instance = new ApplePushService();
    }
    return ApplePushService.instance;
  }
  
  /**
   * Initialize the APN Provider with the .p8 key
   */
  public async initialize(): Promise<void> {
    // If already initialized, return
    if (this.isInitialized) {
      return;
    }
    
    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // Start initialization
    this.initPromise = new Promise<void>((resolve, reject) => {
      try {
        // Get the APNs key from environment variables
        const key = process.env.APK_P8_KEY;
        
        if (!key) {
          console.error('APK_P8_KEY not found in environment variables');
          reject(new Error('APK_P8_KEY not found'));
          return;
        }
        
        console.log('Initializing Apple Push Notification Service...');
        
        // Create a new provider with the key
        this.provider = new Provider({
          token: {
            key,
            keyId: 'KEY_ID', // Replace with actual key ID
            teamId: 'TEAM_ID', // Replace with actual team ID
          },
          production: process.env.NODE_ENV === 'production'
        });
        
        this.isInitialized = true;
        console.log('Apple Push Notification Service initialized successfully');
        resolve();
      } catch (error) {
        console.error('Error initializing APN provider:', error);
        this.provider = null;
        this.isInitialized = false;
        this.initPromise = null;
        reject(error);
      }
    });
    
    return this.initPromise;
  }
  
  /**
   * Send a push notification to a specific device
   * @param deviceToken The APNs device token
   * @param options Notification options
   */
  public async sendNotification(deviceToken: string, options: PushNotificationOptions): Promise<boolean> {
    try {
      // Ensure provider is initialized
      if (!this.isInitialized || !this.provider) {
        console.error('Push notification provider not initialized');
        return false;
      }

      // Create notification payload structure according to APNs format
      const notification = new Notification({
        // Standard alert structure for iOS
        alert: {
          title: options.title,
          body: options.body
        },
        // Other notification properties
        sound: options.sound || 'default',
        badge: options.badge || 1,
        topic: 'com.evoessence.exchange', // Your app bundle ID
        expiry: options.expiry || Math.floor(Date.now() / 1000) + 3600,
        priority: options.priority || 10,
        contentAvailable: 1,
        // Custom data
        payload: {
          ...options.data,
          type: options.type || 'default',
          category: options.category
        }
      });

      // Send the notification
      const result = await this.provider.send(notification, deviceToken);
      
      if (result.failed.length > 0) {
        console.error('Push notification failed:', result.failed[0].response);
        return false;
      }
      
      console.log('Push notification sent successfully to device:', deviceToken);
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Clean up and shutdown the provider
   */
  public shutdown(): void {
    if (this.provider) {
      this.provider.shutdown();
      this.provider = null;
      this.isInitialized = false;
      this.initPromise = null;
    }
  }
}

// Function to get all devices for a user
async function getUserDevices(userId: number) {
  try {
    const devices = await db.select({
      deviceId: userSessions.device_id,
      deviceOs: userSessions.device_os,
      pushToken: userSessions.push_token,
      enabled: userSessions.notifications_enabled
    })
    .from(userSessions)
    .where(
      and(
        eq(userSessions.user_id, userId),
        sql`${userSessions.push_token} IS NOT NULL`,
        eq(userSessions.device_os, 'iOS')
      )
    );
    
    return devices;
  } catch (error) {
    console.error('Error fetching user devices:', error);
    return [];
  }
}

// Main function to send push notification to a specific user
export async function sendPushNotificationToUser(
  userId: number,
  options: PushNotificationOptions
): Promise<{ success: boolean; sent: number; failed: number }> {
  try {
    const pushService = ApplePushService.getInstance();
    await pushService.initialize();
    
    // Get all user devices with push tokens
    const devices = await getUserDevices(userId);
    
    if (!devices || devices.length === 0) {
      console.log(`No devices found for user ${userId}`);
      return { success: false, sent: 0, failed: 0 };
    }
    
    let sent = 0;
    let failed = 0;
    
    // Send notification to each device
    for (const device of devices) {
      if (device.pushToken && device.enabled) {
        const result = await pushService.sendNotification(device.pushToken, options);
        if (result) {
          sent++;
        } else {
          failed++;
        }
      } else {
        failed++;
      }
    }
    
    return {
      success: sent > 0,
      sent,
      failed
    };
  } catch (error) {
    console.error('Error sending push notification to user:', error);
    return { success: false, sent: 0, failed: 1 };
  }
}

// Send a test notification to a user's devices
export async function sendTestNotification(userId: number): Promise<{ success: boolean; sent: number; failed: number }> {
  return sendPushNotificationToUser(userId, {
    title: 'Test Notification',
    body: 'This is a test notification from Evo Exchange',
    badge: 1,
    sound: 'default',
    type: 'test',
    data: {
      test: true,
      timestamp: new Date().toISOString()
    }
  });
}

// Send a transaction notification
export async function sendTransactionNotification(
  userId: number,
  transactionId: string,
  status: string,
  amount: string,
  currency: string
): Promise<{ success: boolean; sent: number; failed: number }> {
  return sendPushNotificationToUser(userId, {
    title: 'Transaction Update',
    body: `Your ${currency} transaction of ${amount} is ${status}`,
    badge: 1,
    sound: 'default',
    type: 'transaction',
    category: 'TRANSACTION_CATEGORY',
    data: {
      transactionId,
      status,
      amount,
      currency,
      timestamp: new Date().toISOString()
    }
  });
}

// Send a price alert notification
export async function sendPriceAlertNotification(
  userId: number,
  currency: string,
  price: string,
  targetPrice: string,
  direction: 'above' | 'below'
): Promise<{ success: boolean; sent: number; failed: number }> {
  const directionText = direction === 'above' ? 'risen above' : 'fallen below';
  
  return sendPushNotificationToUser(userId, {
    title: `${currency} Price Alert`,
    body: `${currency} has ${directionText} your target of ${targetPrice}. Current price: ${price}`,
    badge: 1,
    sound: 'default',
    type: 'price_alert',
    category: 'PRICE_ALERT_CATEGORY',
    data: {
      currency,
      price,
      targetPrice,
      direction,
      timestamp: new Date().toISOString()
    }
  });
}

// Send a security notification
export async function sendSecurityNotification(
  userId: number,
  eventType: string,
  details: string
): Promise<{ success: boolean; sent: number; failed: number }> {
  return sendPushNotificationToUser(userId, {
    title: 'Security Alert',
    body: details,
    badge: 1,
    sound: 'default',
    type: 'security',
    category: 'SECURITY_CATEGORY',
    data: {
      eventType,
      timestamp: new Date().toISOString()
    }
  });
}

export default {
  sendPushNotificationToUser,
  sendTestNotification,
  sendTransactionNotification,
  sendPriceAlertNotification,
  sendSecurityNotification
};