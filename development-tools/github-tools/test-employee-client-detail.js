/**
 * Test script to verify employee client detail API functionality
 */

import fetch from 'node-fetch';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const BASE_URL = 'http://localhost:5000';
const LOGIN_ENDPOINT = `${BASE_URL}/bypass/auth/login`;
const USER_CHECK_ENDPOINT = `${BASE_URL}/bypass/user`;
const CLIENT_DETAIL_ENDPOINT = `${BASE_URL}/bypass/employee/clients`;

async function saveCookies(cookies) {
  fs.writeFileSync('cookie.txt', cookies);
  console.log('Cookies saved to cookie.txt');
}

async function loadCookies() {
  try {
    return fs.readFileSync('cookie.txt', 'utf8');
  } catch (error) {
    console.error('No cookie file found, please login first');
    return '';
  }
}

async function login(username, password) {
  try {
    // Perform login
    const loginRes = await fetch(LOGIN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    // Extract cookies
    const cookies = loginRes.headers.get('set-cookie');
    
    if (cookies) {
      saveCookies(cookies);
    }

    const loginData = await loginRes.json();
    console.log('Login response:', JSON.stringify(loginData, null, 2));

    // Verify the user session
    const userRes = await fetch(USER_CHECK_ENDPOINT, {
      headers: {
        'Cookie': cookies
      }
    });
    
    const userData = await userRes.json();
    console.log('User data:', JSON.stringify(userData, null, 2));
    
    if (userData.authenticated && userData.isEmployee) {
      console.log('Successfully logged in as employee');
      return cookies;
    } else {
      console.error('Login failed or user is not an employee');
      process.exit(1);
    }
  } catch (error) {
    console.error('Login error:', error);
    process.exit(1);
  }
}

async function testClientDetail(cookies, clientId) {
  try {
    // First, get the list of clients
    const listRes = await fetch(`${CLIENT_DETAIL_ENDPOINT}`, {
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      }
    });
    
    const clientList = await listRes.json();
    console.log(`Found ${clientList.length} clients in the system`);
    
    // If a specific client ID wasn't provided, use the first one from the list
    if (!clientId && clientList.length > 0) {
      clientId = clientList[0].id;
      console.log(`Using first client ID: ${clientId}`);
    }
    
    // Get a specific client's details
    const detailRes = await fetch(`${CLIENT_DETAIL_ENDPOINT}/${clientId}`, {
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      }
    });
    
    const clientDetail = await detailRes.json();
    console.log('Client detail response:', JSON.stringify(clientDetail, null, 2));
    
    // Check if the detail contains required fields
    const requiredFields = ['id', 'username', 'email', 'kycStatus', 'kycDocuments'];
    const missingFields = requiredFields.filter(field => !clientDetail.hasOwnProperty(field));
    
    if (missingFields.length > 0) {
      console.error(`Error: Missing required fields in client detail: ${missingFields.join(', ')}`);
    } else {
      console.log('Client detail endpoint working correctly: All required fields present');
    }
    
    return clientDetail;
  } catch (error) {
    console.error('Error testing client detail:', error);
  }
}

async function runTest() {
  try {
    let cookies = await loadCookies();
    const args = process.argv.slice(2);
    
    // Check if credentials are provided as command line arguments
    if (args.length >= 2) {
      const username = args[0];
      const password = args[1];
      cookies = await login(username, password);
    } else if (!cookies) {
      // If no cookies and no credentials, use default test credentials
      cookies = await login('testemployee', 'employee123');
    }
    
    // Extract client ID from arguments if provided
    const clientId = args.length >= 3 ? parseInt(args[2]) : null;
    
    // Test client detail endpoint
    await testClientDetail(cookies, clientId);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTest();