import express, { Request, Response } from "express";
import webSocketService from "../services/websocket";
import { requireAuthentication } from "../middleware/auth";

const router = express.Router();

/**
 * Generate WebSocket auth token for the current user
 * @route GET /api/websocket/token
 * @access Private
 */
router.get('/token', requireAuthentication, (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
        timestamp: new Date().toISOString()
      });
    }

    // Generate a WebSocket token for the user
    // Use the sessionID as a unique identifier for this connection
    const token = webSocketService.generateToken(req.user.id, req.sessionID || '');

    return res.json({
      success: true,
      data: {
        token,
        userId: req.user.id,
        expires: new Date(Date.now() + 86400000).toISOString() // 24 hours
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[WebSocket] Error generating token:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate WebSocket token",
      timestamp: new Date().toISOString()
    });
  }
});

export const registerWebSocketRoutes = (app: express.Express): void => {
  app.use('/api/websocket', router);
  console.log('WebSocket routes registered');
};

export default router;