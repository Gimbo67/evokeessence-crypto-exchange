/**
 * Test script to verify login functionality with recaptchaV2Middleware in place
 */

import axios from 'axios';

// Create a test user first, then test login
// This ensures we have a valid user to test with
async function createTestUser() {
  console.log('Creating a test user for login testing...');
  
  try {
    const response = await axios.post('http://localhost:5000/api/auth/register', {
      username: 'testuser_captcha',
      email: 'testcaptcha@example.com',
      password: 'test1234',
      fullName: 'Test User CAPTCHA',
      recaptchaToken: 'simulated-token-bypassed-in-dev'
    });
    
    console.log('User creation successful:', response.data.success);
    return true;
  } catch (error) {
    console.log('User creation skipped - user might already exist');
    return true; // Continue with login test regardless
  }
}

// Test login with middleware in place
async function testLogin() {
  console.log('Testing login functionality with CAPTCHA middleware in place...');
  
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'testuser_captcha',
      password: 'test1234',
      recaptchaToken: 'simulated-token-bypassed-in-dev'
    });
    
    console.log('Login Response:', response.data);
    console.log('Login successful with recaptchaV2Middleware in place');
    
    // Save the cookie for future requests
    const cookies = response.headers['set-cookie'];
    if (cookies) {
      console.log('Received authentication cookie');
    }
    
    return response.data;
  } catch (error) {
    console.error('Login Error:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Test session endpoint with the recaptchaV2Middleware
async function testSession(loginResponse) {
  if (!loginResponse) {
    console.log('Skipping session test as login failed');
    return;
  }
  
  // Extract user ID from the login response
  const userId = loginResponse.id;
  if (!userId) {
    console.log('Skipping session test as user ID is not available');
    return;
  }
  
  console.log('Testing session endpoint with CAPTCHA middleware in place...');
  
  try {
    const response = await axios.post('http://localhost:5000/api/auth/session', {
      userId: userId,
      twoFactorVerified: true,
      recaptchaToken: 'simulated-token-bypassed-in-dev'
    }, {
      withCredentials: true
    });
    
    console.log('Session Response:', response.data);
    console.log('Session update successful with recaptchaV2Middleware in place');
  } catch (error) {
    console.error('Session Error:', error.response ? error.response.data : error.message);
  }
}

async function runTests() {
  console.log('Starting login test with CAPTCHA middleware...');
  
  // Create test user first
  await createTestUser();
  
  // Then test login
  const loginResponse = await testLogin();
  await testSession(loginResponse);
  
  console.log('All tests completed!');
}

runTests().catch(error => {
  console.error('Test failed with error:', error);
});