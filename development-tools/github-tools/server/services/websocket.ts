import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';
import { parse } from 'url';
import { z } from 'zod';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { db } from '@db';

// Types for the different events our WebSocket service can handle
export type WebSocketEvent = 
  | { type: 'balanceUpdated', userId: number, data: BalanceUpdateData }
  | { type: 'orderStatusChanged', userId: number, data: OrderStatusData }
  | { type: 'kycStatusChanged', userId: number, data: KYCStatusData }
  | { type: 'depositStatusChanged', userId: number, data: DepositStatusData }
  | { type: 'serverNotification', data: ServerNotificationData };

// Data type definitions for each event type
export interface BalanceUpdateData {
  currency: string;
  balance: number;
  previous?: number;
  updatedAt: string;
}

export interface OrderStatusData {
  orderId: number;
  orderType: 'usdt' | 'usdc' | 'other';
  status: string;
  updatedAt: string;
}

export interface KYCStatusData {
  status: string;
  updatedAt: string;
}

export interface DepositStatusData {
  depositId: number;
  status: string;
  amount: number;
  currency: string;
  updatedAt: string;
}

export interface ServerNotificationData {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
}

// Token validation schema
const authTokenSchema = z.object({
  userId: z.number(),
  sessionId: z.string(),
  timestamp: z.number()
});

// WebSocket authentication info
interface WebSocketClient extends WebSocket {
  isAlive: boolean;
  userId?: number;
  sessionId?: string;
  deviceInfo?: string;
  deviceType?: 'ios' | 'android' | 'web' | 'other';
  appVersion?: string;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<number, Set<WebSocketClient>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  // Initialize WebSocket server with the HTTP server
  public initialize(server: Server): WebSocketServer {
    // If WebSocket server already exists, close it before creating a new one
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    // Create new WebSocket server
    this.wss = new WebSocketServer({ noServer: true });

    // Handle upgrade requests for WebSocket
    server.on('upgrade', (request, socket, head) => {
      const { pathname, query } = parse(request.url || '', true);

      // Only handle WebSocket connections to our specific path
      if (pathname === '/ws') {
        const token = query.token as string;
        
        // Verify the token before establishing connection
        this.verifyClient(token)
          .then(authInfo => {
            if (!authInfo) {
              socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
              socket.destroy();
              return;
            }

            this.wss?.handleUpgrade(request, socket, head, (ws) => {
              const client = ws as WebSocketClient;
              client.isAlive = true;
              client.userId = authInfo.userId;
              client.sessionId = authInfo.sessionId;
              client.deviceInfo = query.device as string;
              client.appVersion = query.version as string;
              
              // Detect device type from user agent or query
              const userAgent = request.headers['user-agent'] || '';
              if (query.platform) {
                // Client explicitly specified platform
                const platform = (query.platform as string).toLowerCase();
                if (platform === 'ios') {
                  client.deviceType = 'ios';
                } else if (platform === 'android') {
                  client.deviceType = 'android';
                } else if (platform === 'web') {
                  client.deviceType = 'web';
                } else {
                  client.deviceType = 'other';
                }
              } else if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('EvokeExchange-iOS-App')) {
                client.deviceType = 'ios';
              } else if (userAgent.includes('Android')) {
                client.deviceType = 'android';
              } else if (userAgent.includes('Mozilla')) {
                client.deviceType = 'web';
              } else {
                client.deviceType = 'other';
              }

              // Add this client to our clients map
              this.addClient(client);
              
              // Emit the connection event
              this.wss?.emit('connection', client, request);
            });
          })
          .catch(err => {
            console.error('[WebSocket] Authentication error:', err);
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
          });
      } else {
        // Not a WebSocket request to our endpoint
        socket.destroy();
      }
    });

    // Handle new connections
    this.wss.on('connection', (ws: WebSocketClient) => {
      const client = ws;

      console.log(`[WebSocket] Client connected: User #${client.userId}, Session: ${client.sessionId}`);

      // Send welcome message
      client.send(JSON.stringify({
        type: 'connection',
        message: 'WebSocket connection established',
        timestamp: new Date().toISOString()
      }));

      // Setup ping
      client.on('pong', () => {
        client.isAlive = true;
      });

      // Handle messages from the client
      client.on('message', (message: string) => {
        try {
          const parsedMessage = JSON.parse(message.toString());
          console.log(`[WebSocket] Message from user #${client.userId}:`, parsedMessage);
          
          // Handle client messages here if needed
          if (parsedMessage.type === 'ping') {
            client.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      });

      // Handle client disconnection
      client.on('close', () => {
        console.log(`[WebSocket] Client disconnected: User #${client.userId}, Session: ${client.sessionId}`);
        this.removeClient(client);
      });

      // Handle errors
      client.on('error', (error) => {
        console.error('[WebSocket] Client error:', error);
        this.removeClient(client);
      });
    });

    // Set up the ping interval to detect disconnected clients
    this.pingInterval = setInterval(() => {
      if (!this.wss) return;

      this.wss.clients.forEach((ws) => {
        const client = ws as WebSocketClient;
        if (client.isAlive === false) {
          console.log(`[WebSocket] Terminating inactive client: User #${client.userId}`);
          client.terminate();
          this.removeClient(client);
          return;
        }

        client.isAlive = false;
        client.ping();
      });
    }, 30000); // Check every 30 seconds

    console.log('[WebSocket] Server initialized');
    return this.wss;
  }

  // Verify the authentication token
  private async verifyClient(token: string): Promise<{ userId: number, sessionId: string } | null> {
    if (!token) return null;

    try {
      // In production, use a proper JWT verification here or similar
      // This is a simplified version for development
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      const result = authTokenSchema.safeParse(decoded);
      
      if (!result.success) {
        console.error('[WebSocket] Token validation failed:', result.error);
        return null;
      }

      const authInfo = result.data;
      
      // Check if user exists
      const user = await db.query.users.findFirst({
        where: eq(users.id, authInfo.userId)
      });

      if (!user) {
        console.error('[WebSocket] User not found for token:', authInfo.userId);
        return null;
      }

      // Check token expiration (24 hours)
      const now = Date.now();
      if (now - authInfo.timestamp > 86400000) {
        console.error('[WebSocket] Token expired');
        return null;
      }

      return {
        userId: authInfo.userId,
        sessionId: authInfo.sessionId
      };
    } catch (error) {
      console.error('[WebSocket] Error verifying token:', error);
      return null;
    }
  }

  // Add a client to our clients map
  private addClient(client: WebSocketClient): void {
    if (!client.userId) return;

    let userClients = this.clients.get(client.userId);
    if (!userClients) {
      userClients = new Set();
      this.clients.set(client.userId, userClients);
    }
    userClients.add(client);
  }

  // Remove a client from our clients map
  private removeClient(client: WebSocketClient): void {
    if (!client.userId) return;

    const userClients = this.clients.get(client.userId);
    if (userClients) {
      userClients.delete(client);
      if (userClients.size === 0) {
        this.clients.delete(client.userId);
      }
    }
  }

  // Close the WebSocket server
  public close(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
  }

  // Send event to a specific user
  public sendToUser(userId: number, event: WebSocketEvent): void {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) {
      // No connected clients for this user
      return;
    }

    const message = JSON.stringify(event);
    userClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
  
  // Send event to a specific user's iOS devices only
  public sendToIosDevices(userId: number, event: WebSocketEvent): void {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) {
      // No connected clients for this user
      return;
    }

    const message = JSON.stringify(event);
    userClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN && client.deviceType === 'ios') {
        client.send(message);
      }
    });
  }
  
  // Send event to all devices of a specific type across all users
  public sendToDeviceType(deviceType: 'ios' | 'android' | 'web' | 'other', event: WebSocketEvent): void {
    if (!this.wss) return;
    
    const message = JSON.stringify(event);
    this.wss.clients.forEach(ws => {
      const client = ws as WebSocketClient;
      if (client.readyState === WebSocket.OPEN && client.deviceType === deviceType) {
        client.send(message);
      }
    });
  }

  // Send an event to all connected clients
  public broadcast(event: WebSocketEvent): void {
    if (!this.wss) return;

    const message = JSON.stringify(event);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Generate a WebSocket authentication token
  public generateToken(userId: number, sessionId: string): string {
    const tokenData = {
      userId,
      sessionId,
      timestamp: Date.now()
    };

    return Buffer.from(JSON.stringify(tokenData)).toString('base64');
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;