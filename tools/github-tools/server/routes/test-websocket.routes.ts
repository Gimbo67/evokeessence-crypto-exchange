import express, { Request, Response } from "express";
import webSocketService, { WebSocketEvent } from "../services/websocket";
import { requireAuthentication } from "../middleware/auth";

const router = express.Router();

/**
 * Test sending a notification via WebSocket
 * @route POST /api/test-websocket/notification
 * @access Private
 */
router.post('/notification', requireAuthentication, (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
        timestamp: new Date().toISOString()
      });
    }

    const { type, data } = req.body;
    
    if (!type || !data) {
      return res.status(400).json({
        success: false,
        message: "Missing type or data",
        timestamp: new Date().toISOString()
      });
    }
    
    let event: WebSocketEvent;
    
    switch (type) {
      case 'balanceUpdated':
        event = {
          type: 'balanceUpdated',
          userId: req.user.id,
          data: {
            currency: data.currency || 'USD',
            balance: data.balance || 0,
            previous: data.previous,
            updatedAt: new Date().toISOString()
          }
        };
        break;
        
      case 'orderStatusChanged':
        event = {
          type: 'orderStatusChanged',
          userId: req.user.id,
          data: {
            orderId: data.orderId || 1,
            orderType: data.orderType || 'usdt',
            status: data.status || 'completed',
            updatedAt: new Date().toISOString()
          }
        };
        break;
        
      case 'kycStatusChanged':
        event = {
          type: 'kycStatusChanged',
          userId: req.user.id,
          data: {
            status: data.status || 'approved',
            updatedAt: new Date().toISOString()
          }
        };
        break;
        
      case 'depositStatusChanged':
        event = {
          type: 'depositStatusChanged',
          userId: req.user.id,
          data: {
            depositId: data.depositId || 1,
            status: data.status || 'completed',
            amount: data.amount || 100,
            currency: data.currency || 'USD',
            updatedAt: new Date().toISOString()
          }
        };
        break;
        
      case 'serverNotification':
        event = {
          type: 'serverNotification',
          data: {
            title: data.title || 'Notification',
            message: data.message || 'This is a test notification',
            severity: data.severity || 'info',
            timestamp: new Date().toISOString()
          }
        };
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid event type",
          timestamp: new Date().toISOString()
        });
    }
    
    console.log(`[WebSocket Test] Sending ${type} event to user ${req.user.id}:`, event);
    
    if (type === 'serverNotification') {
      webSocketService.broadcast(event);
    } else {
      webSocketService.sendToUser(req.user.id, event);
    }

    return res.json({
      success: true,
      message: `WebSocket ${type} event sent successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[WebSocket Test] Error sending event:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to send WebSocket event",
      timestamp: new Date().toISOString()
    });
  }
});

export const registerTestWebSocketRoutes = (app: express.Express): void => {
  app.use('/api/test-websocket', router);
  console.log('Test WebSocket routes registered');
};

export default router;