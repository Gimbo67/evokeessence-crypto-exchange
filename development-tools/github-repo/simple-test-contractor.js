/**
 * Simple test script to check contractor login and analytics
 */
import fetch from 'node-fetch';
import fs from 'fs';

const BASE_URL = 'http://localhost:5001'; // Base URL for the API
const API_LOGIN = `${BASE_URL}/api/auth/login`;
const API_USER = `${BASE_URL}/api/user`;
const API_CONTRACTOR_ANALYTICS = `${BASE_URL}/api/contractor/analytics`;

async function main() {
  try {
    console.log('Testing contractor login and analytics...');
    
    // Login as contractor
    console.log('Logging in as contractor...');
    const loginResponse = await fetch(API_LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testcontractor',
        password: 'Testpass123',
        recaptchaToken: 'bypass-token',
      }),
    });
    
    if (!loginResponse.ok) {
      const errorBody = await loginResponse.text();
      console.error(`Login failed with status: ${loginResponse.status}`);
      console.error('Response:', errorBody);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('Login successful:', loginData);
    
    // Get cookies for session management
    const cookies = loginResponse.headers.get('set-cookie');
    if (cookies) {
      fs.writeFileSync('contractor_cookie.txt', cookies);
      console.log('Cookies saved for future requests');
    } else {
      console.error('No cookies received from login response');
      return;
    }
    
    // Check user info from session
    console.log('\nChecking user session...');
    const userResponse = await fetch(API_USER, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
      },
    });
    
    if (!userResponse.ok) {
      console.error(`Session check failed with status: ${userResponse.status}`);
      return;
    }
    
    const userData = await userResponse.json();
    console.log('User session data:', userData);
    
    // Check contractor analytics
    console.log('\nChecking contractor analytics...');
    const analyticsResponse = await fetch(API_CONTRACTOR_ANALYTICS, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
      },
    });
    
    if (!analyticsResponse.ok) {
      console.error(`Analytics request failed with status: ${analyticsResponse.status}`);
      return;
    }
    
    const analyticsData = await analyticsResponse.json();
    console.log('Contractor analytics:', analyticsData);
    
    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('Test error:', error);
  }
}

main();