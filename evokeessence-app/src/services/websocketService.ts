import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiClient } from './authService';
import { Alert } from 'react-native';

// Event types for WebSocket messages
export enum WebSocketEventType {
  PRICE_UPDATE = 'price_update',
  TRANSACTION_UPDATE = 'transaction_update',
  VERIFICATION_STATUS = 'verification_status',
  MARKET_ALERT = 'market_alert',
  DEPOSIT_CONFIRMATION = 'deposit_confirmation',
  WITHDRAWAL_CONFIRMATION = 'withdrawal_confirmation',
  SECURITY_ALERT = 'security_alert',
  CONNECTION_STATUS = 'connection_status',
}

// Interface for WebSocket message
export interface WebSocketMessage {
  type: WebSocketEventType;
  data: any;
}

// Interface for event listeners
type EventListener = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private token: string | null = null;
  private listeners: Map<WebSocketEventType, EventListener[]> = new Map();
  private connectionStatusListeners: ((isConnected: boolean) => void)[] = [];
  
  // Initialize WebSocket connection
  async connect(): Promise<boolean> {
    // If already connected, return true
    if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
      return true;
    }
    
    try {
      // Get auth token for WebSocket connection
      const token = await this.getWebSocketToken();
      if (!token) {
        console.error('WebSocketService: Failed to get token');
        return false;
      }
      
      this.token = token;
      
      // Create WebSocket connection
      const protocol = Platform.OS === 'ios' ? 'wss:' : 'ws:';
      // Determine if running in development or production
      const isLocalDevelopment = __DEV__;
      const host = isLocalDevelopment ? 'localhost:3000' : 'api.evokeessence.com';
      const wsUrl = `${protocol}//${host}/ws`;
      
      this.socket = new WebSocket(wsUrl);
      
      // Set up event handlers
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      
      return true;
    } catch (error) {
      console.error('WebSocketService: Error connecting to WebSocket server', error);
      return false;
    }
  }
  
  // Get WebSocket token from API
  private async getWebSocketToken(): Promise<string | null> {
    try {
      // Check if token exists in SecureStore
      const storedToken = await SecureStore.getItemAsync('ws_token');
      if (storedToken) {
        return storedToken;
      }
      
      // If not, get a new token from API
      const response = await apiClient.get('/user/websocket-token');
      const token = response.data.token;
      
      // Store token in SecureStore
      await SecureStore.setItemAsync('ws_token', token);
      
      return token;
    } catch (error) {
      console.error('WebSocketService: Error getting WebSocket token', error);
      return null;
    }
  }
  
  // Handle WebSocket open event
  private handleOpen(event: Event): void {
    console.log('WebSocketService: Connection established');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Send authentication message
    this.sendMessage({
      type: 'authenticate',
      token: this.token,
      platform: Platform.OS,
      appVersion: '1.0.0', // Replace with actual app version
      deviceInfo: {
        model: Platform.OS === 'ios' ? 'iPhone' : 'Android',
        osVersion: Platform.Version.toString(),
      }
    });
    
    // Start ping interval to keep connection alive
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 30000); // Send ping every 30 seconds
    
    // Notify connection status listeners
    this.notifyConnectionStatusChange(true);
  }
  
  // Handle WebSocket message event
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      
      // Handle different message types
      switch (message.type) {
        case WebSocketEventType.PRICE_UPDATE:
          this.notifyListeners(WebSocketEventType.PRICE_UPDATE, message.data);
          break;
        case WebSocketEventType.TRANSACTION_UPDATE:
          this.notifyListeners(WebSocketEventType.TRANSACTION_UPDATE, message.data);
          break;
        case WebSocketEventType.VERIFICATION_STATUS:
          this.notifyListeners(WebSocketEventType.VERIFICATION_STATUS, message.data);
          break;
        case WebSocketEventType.MARKET_ALERT:
          this.notifyListeners(WebSocketEventType.MARKET_ALERT, message.data);
          break;
        case WebSocketEventType.DEPOSIT_CONFIRMATION:
          this.notifyListeners(WebSocketEventType.DEPOSIT_CONFIRMATION, message.data);
          break;
        case WebSocketEventType.WITHDRAWAL_CONFIRMATION:
          this.notifyListeners(WebSocketEventType.WITHDRAWAL_CONFIRMATION, message.data);
          break;
        case WebSocketEventType.SECURITY_ALERT:
          this.notifyListeners(WebSocketEventType.SECURITY_ALERT, message.data);
          break;
        case 'pong':
          // Received pong response, connection is still alive
          break;
        default:
          console.log('WebSocketService: Unknown message type', message.type);
      }
    } catch (error) {
      console.error('WebSocketService: Error parsing message', error);
    }
  }
  
  // Handle WebSocket close event
  private handleClose(event: CloseEvent): void {
    console.log('WebSocketService: Connection closed', event.code, event.reason);
    this.isConnected = false;
    
    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Attempt to reconnect if not a normal closure
    if (event.code !== 1000) {
      this.attemptReconnect();
    }
    
    // Notify connection status listeners
    this.notifyConnectionStatusChange(false);
  }
  
  // Handle WebSocket error event
  private handleError(event: Event): void {
    console.error('WebSocketService: Error', event);
    
    // Close the socket if it's still open
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
    
    this.isConnected = false;
    this.attemptReconnect();
    
    // Notify connection status listeners
    this.notifyConnectionStatusChange(false);
  }
  
  // Attempt to reconnect to WebSocket server
  private attemptReconnect(): void {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Check if max reconnect attempts reached
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('WebSocketService: Max reconnect attempts reached');
      return;
    }
    
    // Increment reconnect attempts
    this.reconnectAttempts++;
    
    // Calculate backoff time (exponential backoff)
    const backoffTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`WebSocketService: Attempting to reconnect in ${backoffTime}ms (attempt ${this.reconnectAttempts})`);
    
    // Set timeout to reconnect
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, backoffTime);
  }
  
  // Send a ping message to keep the connection alive
  private sendPing(): void {
    if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
      this.sendMessage({ type: 'ping' });
    }
  }
  
  // Send a message to the WebSocket server
  sendMessage(data: any): boolean {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocketService: Cannot send message, not connected');
      return false;
    }
    
    try {
      const message = JSON.stringify(data);
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('WebSocketService: Error sending message', error);
      return false;
    }
  }
  
  // Subscribe to specific event type
  subscribe(eventType: WebSocketEventType, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    const eventListeners = this.listeners.get(eventType)!;
    if (!eventListeners.includes(listener)) {
      eventListeners.push(listener);
    }
  }
  
  // Unsubscribe from specific event type
  unsubscribe(eventType: WebSocketEventType, listener: EventListener): void {
    if (!this.listeners.has(eventType)) {
      return;
    }
    
    const eventListeners = this.listeners.get(eventType)!;
    const index = eventListeners.indexOf(listener);
    
    if (index !== -1) {
      eventListeners.splice(index, 1);
    }
  }
  
  // Notify listeners of event
  private notifyListeners(eventType: WebSocketEventType, data: any): void {
    if (!this.listeners.has(eventType)) {
      return;
    }
    
    const eventListeners = this.listeners.get(eventType)!;
    eventListeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`WebSocketService: Error in listener for ${eventType}`, error);
      }
    });
  }
  
  // Subscribe to connection status changes
  subscribeToConnectionStatus(listener: (isConnected: boolean) => void): void {
    if (!this.connectionStatusListeners.includes(listener)) {
      this.connectionStatusListeners.push(listener);
    }
    
    // Immediately notify with current status
    listener(this.isConnected);
  }
  
  // Unsubscribe from connection status changes
  unsubscribeFromConnectionStatus(listener: (isConnected: boolean) => void): void {
    const index = this.connectionStatusListeners.indexOf(listener);
    
    if (index !== -1) {
      this.connectionStatusListeners.splice(index, 1);
    }
  }
  
  // Notify connection status listeners
  private notifyConnectionStatusChange(isConnected: boolean): void {
    this.connectionStatusListeners.forEach(listener => {
      try {
        listener(isConnected);
      } catch (error) {
        console.error('WebSocketService: Error in connection status listener', error);
      }
    });
  }
  
  // Disconnect WebSocket
  disconnect(): void {
    if (this.socket) {
      // Remove event handlers
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      
      // Close the connection
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
      }
      
      this.socket = null;
    }
    
    // Clear ping interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.isConnected = false;
    
    // Notify connection status listeners
    this.notifyConnectionStatusChange(false);
  }
  
  // Check if WebSocket is connected
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.readyState === WebSocket.OPEN;
  }
  
  // Subscribe to price updates for specific symbols
  subscribeToPriceUpdates(symbols: string[]): void {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocketService: Cannot subscribe to price updates, not connected');
      return;
    }
    
    this.sendMessage({
      type: 'subscribe',
      channel: 'price_updates',
      symbols: symbols
    });
  }
  
  // Unsubscribe from price updates for specific symbols
  unsubscribeFromPriceUpdates(symbols: string[]): void {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocketService: Cannot unsubscribe from price updates, not connected');
      return;
    }
    
    this.sendMessage({
      type: 'unsubscribe',
      channel: 'price_updates',
      symbols: symbols
    });
  }
  
  // Subscribe to user's transaction updates
  subscribeToTransactionUpdates(): void {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocketService: Cannot subscribe to transaction updates, not connected');
      return;
    }
    
    this.sendMessage({
      type: 'subscribe',
      channel: 'transaction_updates'
    });
  }
  
  // Subscribe to verification status updates
  subscribeToVerificationUpdates(): void {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocketService: Cannot subscribe to verification updates, not connected');
      return;
    }
    
    this.sendMessage({
      type: 'subscribe',
      channel: 'verification_status'
    });
  }
}

export default new WebSocketService();