/**
 * Test script to verify the reCAPTCHA middleware bypass on auth routes
 * This test confirms that the reCAPTCHA middleware correctly bypasses validation in development mode
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

async function testLoginEndpoint() {
  console.log('Testing login endpoint with CAPTCHA middleware bypass...');
  
  try {
    // Attempt login without reCAPTCHA token
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'testuser_captcha',
      password: 'incorrect-password'
    });
    
    console.log('Response:', response.data);
    console.log('✓ CAPTCHA bypass successful - returned successful response');
  } catch (error) {
    // Check if error is due to CAPTCHA validation or a different issue
    const errorData = error.response ? error.response.data : { message: error.message };
    console.error('Error:', errorData);
    
    if (error.response && error.response.status === 403 && error.response.data.requireCaptcha) {
      console.log('❌ CAPTCHA middleware is enforcing validation - should be bypassed in dev mode');
    } else if (error.response && (
        errorData.message === 'Incorrect password.' || 
        errorData.message === 'Incorrect username.' ||
        errorData.message === 'User not found')) {
      // This is an expected error that indicates the CAPTCHA validation was bypassed
      // and the request reached the business logic validation
      console.log('✓ CAPTCHA bypass successful - request reached authentication logic');
    } else {
      console.log('❌ Unexpected error response - middleware might not be applied correctly');
    }
  }
}

async function testRegisterEndpoint() {
  console.log('Testing register endpoint with CAPTCHA middleware bypass...');
  
  try {
    // Attempt registration without reCAPTCHA token
    const response = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: 'new-test-user',
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User'
    });
    
    console.log('Response:', response.data);
    console.log('✓ CAPTCHA bypass successful - returned successful response');
  } catch (error) {
    // Check if error is due to CAPTCHA validation or a different issue
    const errorData = error.response ? error.response.data : { message: error.message };
    console.error('Error:', errorData);
    
    if (error.response && error.response.status === 403 && error.response.data.requireCaptcha) {
      console.log('❌ CAPTCHA middleware is enforcing validation - should be bypassed in dev mode');
    } else if (error.response && (
        errorData.message === 'Email already exists' || 
        errorData.message === 'Username already exists')) {
      // This is an expected error that indicates the CAPTCHA validation was bypassed
      // and the request reached the business logic validation
      console.log('✓ CAPTCHA bypass successful - request reached registration logic');
    } else {
      console.log('❌ Unexpected error response - middleware might not be applied correctly');
    }
  }
}

async function testSessionEndpoint() {
  console.log('Testing session endpoint with CAPTCHA middleware bypass...');
  
  try {
    // Attempt 2FA session update without reCAPTCHA token
    const response = await axios.post(`${BASE_URL}/api/auth/session`, {
      userId: 999, // Non-existent user
      twoFactorVerified: true
    });
    
    console.log('Response:', response.data);
    console.log('✓ CAPTCHA bypass successful - returned successful response');
  } catch (error) {
    // Check if error is due to CAPTCHA validation or a different issue
    const errorData = error.response ? error.response.data : { message: error.message };
    console.error('Error:', errorData);
    
    if (error.response && error.response.status === 403 && error.response.data.requireCaptcha) {
      console.log('❌ CAPTCHA middleware is enforcing validation - should be bypassed in dev mode');
    } else if (error.response && (
        errorData.message === 'User not found')) {
      // This is an expected error that indicates the CAPTCHA validation was bypassed
      // and the request reached the business logic validation
      console.log('✓ CAPTCHA bypass successful - request reached session update logic');
    } else {
      console.log('❌ Unexpected error response - middleware might not be applied correctly');
    }
  }
}

async function runTests() {
  console.log('Starting CAPTCHA middleware bypass tests for auth routes...');
  
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