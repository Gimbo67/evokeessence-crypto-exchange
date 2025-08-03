import { WEBSOCKET_URL, APP_CONFIG, STORAGE_KEYS } from './config';
import apiClient from './apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import errorHandler from '../utils/ErrorHandler';

/**
 * WebSocket Service for handling real-time data
 * This service manages WebSocket connections, reconnection, 
 * message parsing, and subscription management
 */
class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectTimeout = null;
    this.messageListeners = new Map();
    this.eventListeners = {
      open: [],
      close: [],
      error: [],
      reconnecting: []
    };
    this.subscriptions = new Set();
    this.lastMessageTime = 0;
    this.pingInterval = null;
    this.userId = null;
    this.deviceInfo = null;
  }

  /**
   * Initialize WebSocket service
   * @param {string} userId - Current user ID
   * @returns {Promise<boolean>} - Success status
   */
  async initialize(userId) {
    if (this.isConnected || this.isConnecting) {
      return true;
    }
    
    this.userId = userId;
    
    try {
      // Get device info
      this.deviceInfo = await this.getDeviceInfo();
      
      // Connect to WebSocket
      return await this.connect();
    } catch (error) {
      console.error('Failed to initialize WebSocket service:', error);
      errorHandler.handleWebsocketError(error);
      return false;
    }
  }

  /**
   * Connect to WebSocket server
   * @returns {Promise<boolean>} - Success status
   */
  async connect() {
    if (this.isConnected || this.isConnecting) {
      return true;
    }
    
    this.isConnecting = true;
    
    try {
      // Get WebSocket token
      const token = await apiClient.getWebSocketToken();
      
      if (!token) {
        console.error('Failed to get WebSocket token');
        this.isConnecting = false;
        return false;
      }
      
      // Close any existing connection
      if (this.ws) {
        this.ws.close();
      }
      
      // Create new WebSocket connection
      this.ws = new WebSocket(`${WEBSOCKET_URL}?token=${token}&platform=ios&appVersion=${this.deviceInfo.appVersion}`);
      
      // Set up event handlers
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      
      // Set up ping interval
      this.setupPingInterval();
      
      return new Promise((resolve) => {
        // Resolve after connection or timeout
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            console.warn('WebSocket connection timed out');
            this.isConnecting = false;
            resolve(false);
          }
        }, 10000);
        
        // Handle successful connection
        const openHandler = () => {
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          resolve(true);
          this.removeEventListener('open', openHandler);
        };
        
        // Handle connection error
        const errorHandler = () => {
          clearTimeout(connectionTimeout);
          this.isConnecting = false;
          resolve(false);
          this.removeEventListener('error', errorHandler);
        };
        
        this.addEventListener('open', openHandler);
        this.addEventListener('error', errorHandler);
      });
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.isConnecting = false;
      return false;
    }
  }

  /**
   * Get device information
   * @returns {Promise<Object>} - Device info
   */
  async getDeviceInfo() {
    try {
      const deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      
      return {
        deviceId: deviceId || 'unknown',
        platform: Platform.OS,
        osVersion: Platform.Version.toString(),
        deviceName: Device.deviceName || 'unknown',
        deviceModel: Device.modelName || 'unknown',
        appVersion: '1.0.0' // TODO: Get from app.json
      };
    } catch (error) {
      console.error('Error getting device info:', error);
      return {
        deviceId: 'unknown',
        platform: Platform.OS,
        osVersion: Platform.Version.toString(),
        deviceName: 'unknown',
        deviceModel: 'unknown',
        appVersion: '1.0.0'
      };
    }
  }

  /**
   * Handle WebSocket open event
   * @param {Event} event - WebSocket event
   */
  handleOpen(event) {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Notify listeners
    this.notifyEventListeners('open', event);
    
    // Resubscribe to previous subscriptions
    this.resubscribe();
    
    // Register device
    this.registerDevice();
  }

  /**
   * Handle WebSocket close event
   * @param {CloseEvent} event - WebSocket close event
   */
  handleClose(event) {
    console.log('WebSocket closed:', event.code, event.reason);
    this.isConnected = false;
    this.isConnecting = false;
    
    // Notify listeners
    this.notifyEventListeners('close', event);
    
    // Clear ping interval
    this.clearPingInterval();
    
    // Attempt to reconnect
    this.reconnect();
  }

  /**
   * Handle WebSocket error event
   * @param {Event} event - WebSocket error event
   */
  handleError(event) {
    console.error('WebSocket error:', event);
    
    // Notify listeners
    this.notifyEventListeners('error', event);
  }

  /**
   * Handle WebSocket message event
   * @param {MessageEvent} event - WebSocket message event
   */
  handleMessage(event) {
    try {
      this.lastMessageTime = Date.now();
      
      // Parse message data
      const data = JSON.parse(event.data);
      
      // Check if it's a system message
      if (data.type === 'system') {
        this.handleSystemMessage(data);
        return;
      }
      
      // Check if it's a pong message
      if (data.type === 'pong') {
        return;
      }
      
      // Notify listeners for this message type
      if (data.type && this.messageListeners.has(data.type)) {
        const listeners = this.messageListeners.get(data.type);
        listeners.forEach(listener => {
          try {
            listener(data);
          } catch (listenerError) {
            console.error(`Error in message listener for type ${data.type}:`, listenerError);
          }
        });
      }
      
      // Notify wildcard listeners
      if (this.messageListeners.has('*')) {
        const wildcardListeners = this.messageListeners.get('*');
        wildcardListeners.forEach(listener => {
          try {
            listener(data);
          } catch (listenerError) {
            console.error('Error in wildcard message listener:', listenerError);
          }
        });
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error, event.data);
    }
  }

  /**
   * Handle system messages
   * @param {Object} message - System message
   */
  handleSystemMessage(message) {
    switch (message.action) {
      case 'reconnect':
        // Server requested reconnect
        console.log('Server requested reconnect');
        this.disconnect();
        this.connect();
        break;
      case 'error':
        console.error('Server error:', message.message);
        break;
      case 'notification':
        // Handle push notification
        console.log('Received notification:', message.data);
        break;
      default:
        console.log('Unknown system message:', message);
    }
  }

  /**
   * Set up ping interval to keep connection alive
   */
  setupPingInterval() {
    // Clear any existing interval
    this.clearPingInterval();
    
    // Set up new interval
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Clear ping interval
   */
  clearPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Send ping message to keep connection alive
   */
  sendPing() {
    if (this.isConnected && this.ws) {
      try {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      } catch (error) {
        console.error('Error sending ping:', error);
      }
    }
  }

  /**
   * Register device with WebSocket server
   */
  async registerDevice() {
    if (!this.isConnected || !this.deviceInfo) {
      return false;
    }
    
    try {
      this.send({
        type: 'register_device',
        data: this.deviceInfo
      });
      
      return true;
    } catch (error) {
      console.error('Error registering device:', error);
      return false;
    }
  }

  /**
   * Send message to WebSocket server
   * @param {Object} message - Message to send
   * @returns {boolean} - Success status
   */
  send(message) {
    if (!this.isConnected || !this.ws) {
      console.warn('Cannot send message: WebSocket not connected');
      return false;
    }
    
    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      return false;
    }
  }

  /**
   * Reconnect to WebSocket server
   */
  reconnect() {
    if (this.isConnecting) {
      return;
    }
    
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Check if maximum reconnect attempts reached
    if (this.reconnectAttempts >= APP_CONFIG.MAX_WEBSOCKET_RECONNECT_ATTEMPTS) {
      console.error('Maximum WebSocket reconnect attempts reached');
      return;
    }
    
    // Increase reconnect attempts
    this.reconnectAttempts++;
    
    // Calculate backoff time
    const backoffTime = Math.min(
      APP_CONFIG.WEBSOCKET_RECONNECT_INTERVAL * Math.pow(1.5, this.reconnectAttempts - 1),
      30000 // Maximum backoff time: 30 seconds
    );
    
    console.log(`Reconnecting WebSocket in ${backoffTime}ms (attempt ${this.reconnectAttempts})...`);
    
    // Notify listeners
    this.notifyEventListeners('reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: APP_CONFIG.MAX_WEBSOCKET_RECONNECT_ATTEMPTS,
      backoffTime
    });
    
    // Set up reconnect timeout
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, backoffTime);
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.ws) {
      // Close connection
      this.ws.close();
      this.ws = null;
    }
    
    // Clear ping interval
    this.clearPingInterval();
    
    // Clear reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Subscribe to a topic
   * @param {string} topic - Topic to subscribe to
   * @returns {boolean} - Success status
   */
  subscribe(topic) {
    if (!topic) {
      return false;
    }
    
    // Add to subscriptions set
    this.subscriptions.add(topic);
    
    // Send subscribe message if connected
    if (this.isConnected) {
      return this.send({
        type: 'subscribe',
        topic
      });
    }
    
    return true;
  }

  /**
   * Unsubscribe from a topic
   * @param {string} topic - Topic to unsubscribe from
   * @returns {boolean} - Success status
   */
  unsubscribe(topic) {
    if (!topic) {
      return false;
    }
    
    // Remove from subscriptions set
    this.subscriptions.delete(topic);
    
    // Send unsubscribe message if connected
    if (this.isConnected) {
      return this.send({
        type: 'unsubscribe',
        topic
      });
    }
    
    return true;
  }

  /**
   * Resubscribe to all previous subscriptions
   */
  resubscribe() {
    if (!this.isConnected || this.subscriptions.size === 0) {
      return;
    }
    
    // Subscribe to all topics in the subscriptions set
    this.subscriptions.forEach(topic => {
      this.send({
        type: 'subscribe',
        topic
      });
    });
  }

  /**
   * Add message listener
   * @param {string} type - Message type to listen for
   * @param {Function} listener - Listener function
   * @returns {Function} - Unsubscribe function
   */
  addMessageListener(type, listener) {
    if (!type || typeof listener !== 'function') {
      return () => {};
    }
    
    // Initialize listeners array for this type if not exists
    if (!this.messageListeners.has(type)) {
      this.messageListeners.set(type, []);
    }
    
    // Add listener
    this.messageListeners.get(type).push(listener);
    
    // Return unsubscribe function
    return () => {
      this.removeMessageListener(type, listener);
    };
  }

  /**
   * Remove message listener
   * @param {string} type - Message type
   * @param {Function} listener - Listener function
   */
  removeMessageListener(type, listener) {
    if (!type || !this.messageListeners.has(type)) {
      return;
    }
    
    const listeners = this.messageListeners.get(type);
    const index = listeners.indexOf(listener);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    
    // Remove empty listener arrays
    if (listeners.length === 0) {
      this.messageListeners.delete(type);
    }
  }

  /**
   * Add event listener
   * @param {string} event - Event type (open, close, error, reconnecting)
   * @param {Function} listener - Listener function
   * @returns {Function} - Unsubscribe function
   */
  addEventListener(event, listener) {
    if (!event || typeof listener !== 'function' || !this.eventListeners[event]) {
      return () => {};
    }
    
    // Add listener
    this.eventListeners[event].push(listener);
    
    // Return unsubscribe function
    return () => {
      this.removeEventListener(event, listener);
    };
  }

  /**
   * Remove event listener
   * @param {string} event - Event type
   * @param {Function} listener - Listener function
   */
  removeEventListener(event, listener) {
    if (!event || !this.eventListeners[event]) {
      return;
    }
    
    const listeners = this.eventListeners[event];
    const index = listeners.indexOf(listener);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Notify all event listeners
   * @param {string} event - Event type
   * @param {any} data - Event data
   */
  notifyEventListeners(event, data) {
    if (!event || !this.eventListeners[event]) {
      return;
    }
    
    const listeners = [...this.eventListeners[event]];
    
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in ${event} event listener:`, error);
      }
    });
  }

  /**
   * Check if WebSocket is connected
   * @returns {boolean} - Connection status
   */
  isWebSocketConnected() {
    return this.isConnected;
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;