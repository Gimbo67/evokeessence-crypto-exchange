import { Alert } from 'react-native';
import { websocketAPI } from './api';

// Event types for WebSocket messages
export const EVENT_TYPES = {
  BALANCE_UPDATE: 'balance_update',
  ORDER_STATUS: 'order_status',
  VERIFICATION_STATUS: 'verification_status',
  PRICE_ALERT: 'price_alert',
  SYSTEM_NOTIFICATION: 'system_notification',
  DEPOSIT_CONFIRMED: 'deposit_confirmed',
  WITHDRAWAL_STATUS: 'withdrawal_status',
  TRANSACTION_CONFIRMED: 'transaction_confirmed',
  ADMIN_NOTIFICATION: 'admin_notification',
  CONTRACTOR_UPDATE: 'contractor_update'
};

// WebSocket connection states
export const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error'
};

class WebSocketService {
  constructor() {
    this.socket = null;
    this.token = null;
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.eventListeners = {};
    this.pingInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimer = null;
    this.connectionStateListeners = [];
  }

  // Establish WebSocket connection
  async connect() {
    if (this.socket && this.connectionState === CONNECTION_STATES.CONNECTED) {
      console.log('WebSocket already connected');
      return;
    }
    
    this._updateConnectionState(CONNECTION_STATES.CONNECTING);
    
    try {
      // Get authentication token for WebSocket connection
      const tokenResponse = await websocketAPI.getToken();
      this.token = tokenResponse.token;
      
      // Determine WebSocket URL (use WSS for HTTPS connections)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?token=${this.token}`;
      
      // Create WebSocket connection
      this.socket = new WebSocket(wsUrl);
      
      // Set up event handlers
      this.socket.onopen = this._handleOpen.bind(this);
      this.socket.onmessage = this._handleMessage.bind(this);
      this.socket.onclose = this._handleClose.bind(this);
      this.socket.onerror = this._handleError.bind(this);
      
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this._updateConnectionState(CONNECTION_STATES.ERROR);
      this._scheduleReconnect();
    }
  }
  
  // Disconnect WebSocket
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this._updateConnectionState(CONNECTION_STATES.DISCONNECTED);
  }
  
  // Add event listener for specific event type
  addEventListener(eventType, callback) {
    if (!this.eventListeners[eventType]) {
      this.eventListeners[eventType] = [];
    }
    
    this.eventListeners[eventType].push(callback);
    return () => this.removeEventListener(eventType, callback);
  }
  
  // Remove event listener
  removeEventListener(eventType, callback) {
    if (!this.eventListeners[eventType]) return;
    
    this.eventListeners[eventType] = this.eventListeners[eventType]
      .filter(listener => listener !== callback);
  }
  
  // Add connection state change listener
  addConnectionStateListener(callback) {
    this.connectionStateListeners.push(callback);
    // Immediately call with current state
    callback(this.connectionState);
    
    return () => this.removeConnectionStateListener(callback);
  }
  
  // Remove connection state change listener
  removeConnectionStateListener(callback) {
    this.connectionStateListeners = this.connectionStateListeners
      .filter(listener => listener !== callback);
  }
  
  // Update connection state and notify listeners
  _updateConnectionState(state) {
    this.connectionState = state;
    this.connectionStateListeners.forEach(listener => listener(state));
  }
  
  // Handle WebSocket open event
  _handleOpen() {
    console.log('WebSocket connected');
    this._updateConnectionState(CONNECTION_STATES.CONNECTED);
    this.reconnectAttempts = 0;
    
    // Start ping interval to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }
  
  // Handle WebSocket message event
  _handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Handle ping/pong for connection health check
      if (data.type === 'pong') {
        return;
      }
      
      // Process message based on event type
      if (data.type && this.eventListeners[data.type]) {
        this.eventListeners[data.type].forEach(callback => callback(data.payload));
      }
      
      // Global message listeners
      if (this.eventListeners['all']) {
        this.eventListeners['all'].forEach(callback => callback(data));
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  }
  
  // Handle WebSocket close event
  _handleClose(event) {
    console.log(`WebSocket closed: ${event.code} ${event.reason}`);
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    this._updateConnectionState(CONNECTION_STATES.DISCONNECTED);
    
    // Attempt to reconnect if not closed intentionally
    if (event.code !== 1000) {
      this._scheduleReconnect();
    }
  }
  
  // Handle WebSocket error event
  _handleError(error) {
    console.error('WebSocket error:', error);
    this._updateConnectionState(CONNECTION_STATES.ERROR);
  }
  
  // Schedule reconnect with exponential backoff
  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnect attempts reached');
      return;
    }
    
    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    console.log(`Scheduling reconnect in ${delay}ms`);
    
    this.reconnectAttempts++;
    
    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }
  
  // Send data to WebSocket server
  send(data) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return false;
    }
    
    try {
      this.socket.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }
  
  // Get current connection state
  getConnectionState() {
    return this.connectionState;
  }
  
  // Is currently connected
  isConnected() {
    return this.connectionState === CONNECTION_STATES.CONNECTED;
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;