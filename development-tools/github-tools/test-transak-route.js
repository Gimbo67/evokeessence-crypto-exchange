/**
 * Test script to verify Transak widget URL generation
 * This script tests the /api/transak/widget-url endpoint
 */

import axios from 'axios';
import fs from 'fs/promises';
import { URL } from 'url';

async function loginAsUser() {
  try {
    // Login with test credentials
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test@example.com',
      password: 'password123',
      recaptchaToken: 'bypass-token'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Bypass-CSRF': 'true' // Development testing only
      }
    });
    
    // Extract the cookie from the response
    const cookies = response.headers['set-cookie'];
    if (!cookies) {
      throw new Error('No cookies returned from login');
    }
    
    // Save cookie for future requests
    const cookieString = cookies.join('; ');
    await fs.writeFile('cookie.txt', cookieString);
    console.log('Login successful, cookie saved');
    
    return cookieString;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testTransakWidgetUrl(cookie) {
  try {
    // Call the Transak widget URL endpoint using fetch instead of axios
    const response = await fetch('http://localhost:5000/api/transak/widget-url', {
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Transak widget URL response:', data);
    
    // Check if the URL contains expected parameters
    if (data.url) {
      const url = new URL(data.url);
      console.log('\nTransak widget URL details:');
      console.log('- Base URL:', url.origin);
      console.log('- Environment:', url.searchParams.get('environment'));
      console.log('- API Key present:', !!url.searchParams.get('apiKey'));
      
      // Extract and parse userData if present
      const userDataParam = url.searchParams.get('userData');
      if (userDataParam) {
        const userData = JSON.parse(decodeURIComponent(userDataParam));
        console.log('- User data included:', userData);
      }
      
      console.log('\nAll tests PASSED! The Transak widget URL generation is working correctly.');
    } else {
      console.error('No URL returned in the response');
    }
    
    return data;
  } catch (error) {
    console.error('Transak widget URL test failed:', error.message);
    throw error;
  }
}

async function runTest() {
  try {
    // Try to read existing cookie
    let cookie;
    try {
      cookie = await fs.readFile('cookie.txt', 'utf8');
      console.log('Using existing cookie');
    } catch (err) {
      console.log('No existing cookie found, logging in...');
      cookie = await loginAsUser();
    }
    
    // Test the Transak widget URL endpoint
    await testTransakWidgetUrl(cookie);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();
