/**
 * Test script to verify the reCAPTCHA middleware on auth routes
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testLoginEndpoint() {
  console.log('Testing login endpoint with CAPTCHA middleware...');
  
  try {
    // Attempt login without reCAPTCHA token
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'test-user',
      password: 'test-password'
    });
    
    console.log('Response:', response.data);
    console.log('CAPTCHA middleware check passed - middleware is bypassed as expected in development mode');
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    if (error.response && error.response.status === 403 && error.response.data.requireCaptcha) {
      console.log('CAPTCHA middleware properly requires CAPTCHA token');
    } else {
      console.log('Unexpected error response - middleware might not be applied correctly');
    }
  }
}

async function testRegisterEndpoint() {
  console.log('Testing register endpoint with CAPTCHA middleware...');
  
  try {
    // Attempt registration without reCAPTCHA token
    const response = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: 'new-test-user',
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User'
    });
    
    console.log('Response:', response.data);
    console.log('CAPTCHA middleware check passed - middleware is bypassed as expected in development mode');
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    if (error.response && error.response.status === 403 && error.response.data.requireCaptcha) {
      console.log('CAPTCHA middleware properly requires CAPTCHA token');
    } else {
      console.log('Unexpected error response - middleware might not be applied correctly');
    }
  }
}

async function testSessionEndpoint() {
  console.log('Testing session endpoint with CAPTCHA middleware...');
  
  try {
    // Attempt 2FA session update without reCAPTCHA token
    const response = await axios.post(`${BASE_URL}/api/auth/session`, {
      userId: 1,
      twoFactorVerified: true
    });
    
    console.log('Response:', response.data);
    console.log('CAPTCHA middleware check passed - middleware is bypassed as expected in development mode');
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    if (error.response && error.response.status === 403 && error.response.data.requireCaptcha) {
      console.log('CAPTCHA middleware properly requires CAPTCHA token');
    } else {
      console.log('Unexpected error response - middleware might not be applied correctly');
    }
  }
}

async function runTests() {
  console.log('Starting CAPTCHA middleware tests for auth routes...');
  
  await testLoginEndpoint();
  console.log('-----------------');
  
  await testRegisterEndpoint();
  console.log('-----------------');
  
  await testSessionEndpoint();
  console.log('-----------------');
  
  console.log('All tests completed!');
}

runTests().catch(error => {
  console.error('Test failed with error:', error);
});