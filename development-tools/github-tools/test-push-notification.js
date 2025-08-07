/**
 * This test script demonstrates how to use the push notification API
 * It registers a test device and sends a push notification to it
 */

const axios = require('axios');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = 'http://localhost:3000';
const DEVICE_ID = uuidv4(); // Generate a test device ID
const MOCK_DEVICE_TOKEN = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'; // Mock device token

// Login credentials
const USERNAME = 'admin';
const PASSWORD = 'admin123';

// Store auth cookie
let authCookie = '';

/**
 * Helper function to call API endpoints
 */
async function callApi(endpoint, method = 'GET', data = null) {
  try {
    const options = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Add auth cookie if available
    if (authCookie) {
      options.headers.Cookie = authCookie;
    }

    // Add X-App-Platform header for iOS app endpoints
    if (endpoint.includes('/push-notifications')) {
      options.headers['X-App-Platform'] = 'iOS';
    }

    // Add request body if provided
    if (data) {
      options.data = data;
    }

    const response = await axios(options);
    return response.data;
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Login as test user
 */
async function login(username, password) {
  try {
    console.log(`Logging in as ${username}...`);
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username,
      password
    }, {
      withCredentials: true
    });
    
    // Save the cookie for future requests
    if (response.headers['set-cookie']) {
      authCookie = response.headers['set-cookie'][0];
      fs.writeFileSync('test_cookie.txt', authCookie);
      console.log('Auth cookie saved');
    }
    
    console.log('Login successful');
    return response.data;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Register a device with the user
 */
async function registerUserDevice() {
  try {
    console.log('Registering test device...');
    
    const deviceData = {
      deviceId: DEVICE_ID,
      deviceName: 'Test iPhone',
      deviceModel: 'iPhone 15 Pro',
      osVersion: 'iOS 17.4'
    };
    
    const response = await callApi('/api/user-devices/register', 'POST', deviceData);
    console.log('Device registered successfully:', response);
    return response;
  } catch (error) {
    console.error('Device registration failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Update push token for the device
 */
async function updateDeviceToken() {
  try {
    console.log('Updating push token...');
    
    const tokenData = {
      deviceId: DEVICE_ID,
      deviceToken: MOCK_DEVICE_TOKEN
    };
    
    const response = await callApi('/api/push-notifications/update-token', 'POST', tokenData);
    console.log('Push token updated successfully:', response);
    return response;
  } catch (error) {
    console.error('Push token update failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Toggle push notifications for the device
 */
async function togglePushNotifications(enabled = true) {
  try {
    console.log(`${enabled ? 'Enabling' : 'Disabling'} push notifications...`);
    
    const data = {
      deviceId: DEVICE_ID,
      enabled
    };
    
    const response = await callApi('/api/push-notifications/toggle', 'POST', data);
    console.log(`Push notifications ${enabled ? 'enabled' : 'disabled'} successfully:`, response);
    return response;
  } catch (error) {
    console.error('Toggle push notifications failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get notification settings for all devices
 */
async function getNotificationSettings() {
  try {
    console.log('Getting notification settings...');
    
    const response = await callApi('/api/push-notifications/settings');
    console.log('Notification settings:', response);
    return response;
  } catch (error) {
    console.error('Getting notification settings failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send a test notification
 */
async function sendTestNotification() {
  try {
    console.log('Sending test notification...');
    
    const response = await callApi('/api/push-notifications/test', 'POST');
    console.log('Test notification sent:', response);
    return response;
  } catch (error) {
    console.error('Sending test notification failed:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Main function to run the test
 */
async function main() {
  try {
    // Step 1: Login
    await login(USERNAME, PASSWORD);
    
    // Step 2: Register a device
    await registerUserDevice();
    
    // Step 3: Update push token
    await updateDeviceToken();
    
    // Step 4: Enable push notifications
    await togglePushNotifications(true);
    
    // Step 5: Get notification settings
    await getNotificationSettings();
    
    // Step 6: Send a test notification
    await sendTestNotification();
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
main();