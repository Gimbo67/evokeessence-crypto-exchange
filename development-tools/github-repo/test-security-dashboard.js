/**
 * Test script to verify the security dashboard functionality
 */
import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'http://localhost:5000';
let cookies = '';

async function login() {
  try {
    console.log('Attempting to login as admin...');
    const response = await axios.post(`${BASE_URL}/api/login`, {
      username: 'duylam',
      password: 'EvokeEssence123'  // Using a standard password for testing
    }, {
      withCredentials: true
    });
    
    // Save cookies for subsequent requests
    if (response.headers['set-cookie']) {
      cookies = response.headers['set-cookie'][0];
      console.log('Login successful, auth cookie received');
    }
    
    return response.data;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getSecurityDashboard() {
  try {
    console.log('Fetching security dashboard data...');
    const response = await axios.get(`${BASE_URL}/api/admin/security/dashboard`, {
      headers: {
        Cookie: cookies
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Security dashboard request failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getBannedIPs() {
  try {
    console.log('Fetching banned IPs list...');
    const response = await axios.get(`${BASE_URL}/api/admin/security/banned-ips`, {
      headers: {
        Cookie: cookies
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Banned IPs request failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getLogs() {
  try {
    console.log('Fetching security logs...');
    const response = await axios.get(`${BASE_URL}/api/admin/security/logs`, {
      headers: {
        Cookie: cookies
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Security logs request failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getStats() {
  try {
    console.log('Fetching security statistics...');
    const response = await axios.get(`${BASE_URL}/api/admin/security/stats`, {
      headers: {
        Cookie: cookies
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Security stats request failed:', error.response?.data || error.message);
    throw error;
  }
}

async function runTest() {
  try {
    // First login to get authentication cookie
    await login();
    
    // Test the security dashboard endpoints
    const dashboardData = await getSecurityDashboard();
    console.log('Security Dashboard Data:', JSON.stringify(dashboardData, null, 2));
    
    const bannedIPs = await getBannedIPs();
    console.log('Banned IPs:', JSON.stringify(bannedIPs, null, 2));
    
    const logs = await getLogs();
    console.log('Security Logs:', JSON.stringify(logs, null, 2));
    
    const stats = await getStats();
    console.log('Security Stats:', JSON.stringify(stats, null, 2));
    
    console.log('All security endpoints tested successfully!');
  } catch (error) {
    console.error('Error running test:', error);
  }
}

runTest();