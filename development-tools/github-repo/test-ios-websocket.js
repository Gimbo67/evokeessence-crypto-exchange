/**
 * Test script for iOS WebSocket integration
 * This script simulates an iOS app connecting to the WebSocket server with device info
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');
const fs = require('fs');

// Test configuration
const config = {
  apiBaseUrl: 'http://localhost:3000',
  wsBaseUrl: 'ws://localhost:3000/ws',
  username: 'test1234',
  password: 'Test1234!',
  deviceInfo: {
    model: 'iPhone15,2',  // iPhone 14 Pro
    os: 'iOS',
    osVersion: '17.4',
    appVersion: '1.0.0',
    deviceId: 'test-device-id-12345',
    locale: 'en_US',
    timezone: 'Europe/Prague'
  }
};

// File to store auth cookie
const COOKIE_FILE = 'ios_app_cookie.txt';
const TOKEN_FILE = 'websocket_token.txt';

// Login function
async function login() {
  try {
    console.log('Logging in as', config.username);
    
    const response = await fetch(`${config.apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ios-app': 'true',
        'x-app-version': config.deviceInfo.appVersion,
        'User-Agent': `EvokeExchange-iOS-App/${config.deviceInfo.appVersion} (${config.deviceInfo.model}; ${config.deviceInfo.os} ${config.deviceInfo.osVersion})`
      },
      body: JSON.stringify({
        username: config.username,
        password: config.password
      })
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }
    
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      fs.writeFileSync(COOKIE_FILE, cookies);
      console.log('Saved authentication cookies');
    }
    
    const data = await response.json();
    console.log('Login successful:', data.success);
    
    return cookies;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Get WebSocket token
async function getWebSocketToken(cookies) {
  try {
    console.log('Requesting WebSocket token');
    
    const response = await fetch(`${config.apiBaseUrl}/api/websocket/token`, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
        'x-ios-app': 'true',
        'x-app-version': config.deviceInfo.appVersion,
        'User-Agent': `EvokeExchange-iOS-App/${config.deviceInfo.appVersion} (${config.deviceInfo.model}; ${config.deviceInfo.os} ${config.deviceInfo.osVersion})`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get WebSocket token: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Received WebSocket token');
    
    // Save token to file
    fs.writeFileSync(TOKEN_FILE, data.token);
    
    return data.token;
  } catch (error) {
    console.error('WebSocket token error:', error);
    throw error;
  }
}

// Connect to WebSocket
function connectToWebSocket(token) {
  console.log('Connecting to WebSocket server');
  
  // Create WebSocket URL with device information
  const wsUrl = `${config.wsBaseUrl}?token=${token}&platform=ios&version=${config.deviceInfo.appVersion}&device=${encodeURIComponent(config.deviceInfo.model)}`;
  console.log('WebSocket URL:', wsUrl);
  
  const ws = new WebSocket(wsUrl);
  
  ws.on('open', () => {
    console.log('WebSocket connection established');
    
    // Send ping message every 10 seconds
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const pingMessage = JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        });
        ws.send(pingMessage);
        console.log('Sent ping');
      } else {
        clearInterval(pingInterval);
      }
    }, 10000);
    
    // Close connection after 30 seconds for test purposes
    setTimeout(() => {
      console.log('Test complete, closing connection');
      clearInterval(pingInterval);
      ws.close();
    }, 30000);
  });
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received message:', data);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  return ws;
}

// Check if app config is properly set up
async function checkAppConfig() {
  try {
    console.log('Checking app configuration');
    
    const response = await fetch(`${config.apiBaseUrl}/api/app-config`, {
      method: 'GET',
      headers: {
        'x-ios-app': 'true',
        'User-Agent': `EvokeExchange-iOS-App/${config.deviceInfo.appVersion} (${config.deviceInfo.model}; ${config.deviceInfo.os} ${config.deviceInfo.osVersion})`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get app config: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('App configuration received');
    
    // Check for iOS specific configuration
    if (data.data.websocket && data.data.websocket.ios) {
      console.log('iOS WebSocket configuration is present:');
      console.log(JSON.stringify(data.data.websocket.ios, null, 2));
    } else {
      console.warn('iOS WebSocket configuration is missing!');
    }
    
    // Check for device management configuration
    if (data.data.devices && data.data.devices.management) {
      console.log('Device management configuration is present:');
      console.log(JSON.stringify(data.data.devices.management, null, 2));
    } else {
      console.warn('Device management configuration is missing!');
    }
    
    return data;
  } catch (error) {
    console.error('App config error:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    let cookies, token;
    
    // First check app configuration
    await checkAppConfig();
    
    // Try to read existing cookie from file
    if (fs.existsSync(COOKIE_FILE)) {
      cookies = fs.readFileSync(COOKIE_FILE, 'utf8');
      console.log('Found existing cookies');
    } else {
      cookies = await login();
    }
    
    // Try to read existing token from file
    if (fs.existsSync(TOKEN_FILE)) {
      token = fs.readFileSync(TOKEN_FILE, 'utf8');
      console.log('Found existing WebSocket token');
    } else {
      token = await getWebSocketToken(cookies);
    }
    
    // Connect to WebSocket
    connectToWebSocket(token);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test
main();