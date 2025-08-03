/**
 * Test script to verify iOS app authentication without reCAPTCHA
 * 
 * This script simulates an iOS app authenticating by sending the appropriate headers
 */

import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';

// Test login with iOS app headers
async function testIOSAppLogin() {
  console.log('Testing login as iOS app (should bypass reCAPTCHA)...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'testuser_captcha',  // Using the test user from test-login-with-captcha.js
      password: 'test1234', // Using the test password
    }, {
      headers: {
        'x-ios-app': 'true',
        'x-app-version': '1.0.0',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Login Response Status:', response.status);
    console.log('Login Response:', response.data);
    
    // Save the cookies for future requests
    if (response.headers['set-cookie']) {
      fs.writeFileSync('ios_app_cookie.txt', response.headers['set-cookie'].join('; '));
      console.log('Authentication cookie saved to ios_app_cookie.txt');
    }
    
    return response.data;
  } catch (error) {
    console.error('Login Error:', error.response ? error.response.data : error.message);
    console.error('Status Code:', error.response ? error.response.status : 'No response');
    return null;
  }
}

// Test user info endpoint with iOS app headers
async function testUserInfo() {
  console.log('\nTesting user info endpoint as iOS app...');
  
  try {
    // Load cookie if available
    let cookies = '';
    try {
      cookies = fs.readFileSync('ios_app_cookie.txt', 'utf8');
    } catch (err) {
      console.log('No saved cookie found. Please run login test first.');
    }
    
    const response = await axios.get(`${BASE_URL}/api/user`, {
      headers: {
        'x-ios-app': 'true',
        'x-app-version': '1.0.0',
        'Cookie': cookies
      }
    });
    
    console.log('User Info Response Status:', response.status);
    console.log('User Info Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('User Info Error:', error.response ? error.response.data : error.message);
    console.error('Status Code:', error.response ? error.response.status : 'No response');
    return null;
  }
}

// Test register endpoint with iOS app headers
async function testIOSAppRegister() {
  console.log('\nTesting registration as iOS app (should bypass reCAPTCHA)...');
  
  // Generate a random username to avoid conflicts
  const randomUsername = 'iosapp_user_' + Math.floor(Math.random() * 10000);
  
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: randomUsername,
      password: 'Password123!',
      email: `${randomUsername}@example.com`,
      fullName: 'iOS App Test User'
    }, {
      headers: {
        'x-ios-app': 'true',
        'x-app-version': '1.0.0',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Register Response Status:', response.status);
    console.log('Register Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Register Error:', error.response ? error.response.data : error.message);
    console.error('Status Code:', error.response ? error.response.status : 'No response');
    return null;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting iOS app authentication tests...');
  
  // Test login
  await testIOSAppLogin();
  
  // Test user info
  await testUserInfo();
  
  // Test registration
  await testIOSAppRegister();
  
  console.log('\nAll iOS app authentication tests completed!');
}

runTests().catch(error => {
  console.error('Tests failed with error:', error);
});