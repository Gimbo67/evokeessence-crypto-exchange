/**
 * Test script to verify the security API endpoints
 */
import axios from 'axios';
import fs from 'fs';
import { promises as fsPromises } from 'fs';

const BASE_URL = 'http://localhost:5000';
let cookies = '';

// Login function
async function login() {
  try {
    console.log('Logging in...');
    const response = await axios.post(`${BASE_URL}/bypass/auth/login`, {
      username: 'admin',
      password: 'Adm1nU2017',
      recaptchaToken: 'dummy-token-for-dev'
    }, {
      withCredentials: true
    });
    
    if (response.data && response.data.authenticated) {
      console.log('Login successful!');
      cookies = response.headers['set-cookie'].join('; ');
      await fsPromises.writeFile('admin_cookie.txt', cookies);
      return true;
    } else {
      console.error('Login failed:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Login request failed:', error.response?.data || error.message);
    return false;
  }
}

// Get security dashboard data
async function getSecurityDashboard() {
  try {
    console.log('Fetching security dashboard data using bypass route...');
    const response = await axios.get(`${BASE_URL}/bypass/api/security/dashboard`, {
      headers: {
        Cookie: cookies,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Request': 'true'
      }
    });
    
    console.log('Security Dashboard Data:', response.data);
    return response.data;
  } catch (error) {
    console.error('Security dashboard request failed:', error.response?.data || error.message);
    throw error;
  }
}

// Get banned IPs
async function getBannedIPs() {
  try {
    console.log('Fetching banned IPs using bypass route...');
    const response = await axios.get(`${BASE_URL}/bypass/api/security/banned-ips`, {
      headers: {
        Cookie: cookies,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Request': 'true'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Banned IPs request failed:', error.response?.data || error.message);
    throw error;
  }
}

// Get security logs
async function getLogs() {
  try {
    console.log('Fetching security logs using bypass route...');
    const response = await axios.get(`${BASE_URL}/bypass/api/security/logs`, {
      headers: {
        Cookie: cookies,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Request': 'true'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Security logs request failed:', error.response?.data || error.message);
    throw error;
  }
}

// Get security statistics
async function getStats() {
  try {
    console.log('Fetching security statistics using bypass route...');
    const response = await axios.get(`${BASE_URL}/bypass/api/security/stats`, {
      headers: {
        Cookie: cookies,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Request': 'true'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Security stats request failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test manually banning an IP
async function testManualBan() {
  try {
    console.log('Testing manual IP ban using bypass route...');
    const testIP = '192.168.1.100'; // Test IP to ban
    
    const response = await axios.post(`${BASE_URL}/bypass/api/security/manual-ban`, {
      ip: testIP
    }, {
      headers: {
        Cookie: cookies,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Request': 'true'
      }
    });
    
    console.log('Manual ban response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Manual ban request failed:', error.response?.data || error.message);
    throw error;
  }
}

// Test unbanning an IP
async function testUnban(ip) {
  try {
    console.log(`Testing unbanning IP: ${ip} using bypass route...`);
    
    const response = await axios.post(`${BASE_URL}/bypass/api/security/unban`, {
      ip: ip
    }, {
      headers: {
        Cookie: cookies,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-API-Request': 'true'
      }
    });
    
    console.log('Unban response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Unban request failed:', error.response?.data || error.message);
    throw error;
  }
}

// Run tests
async function runTest() {
  try {
    // First login to get authentication cookie
    await login();
    
    // Test the security dashboard endpoints
    try {
      const dashboardData = await getSecurityDashboard();
      console.log('Security Dashboard Data:', dashboardData);
    } catch (err) {
      console.error('Error fetching dashboard:', err.message);
    }
    
    try {
      const bannedIPs = await getBannedIPs();
      console.log('Banned IPs:', bannedIPs);
    } catch (err) {
      console.error('Error fetching banned IPs:', err.message);
    }
    
    try {
      const logs = await getLogs();
      console.log('Security Logs:', logs);
    } catch (err) {
      console.error('Error fetching logs:', err.message);
    }
    
    try {
      const stats = await getStats();
      console.log('Security Stats:', stats);
    } catch (err) {
      console.error('Error fetching stats:', err.message);
    }
    
    // Test manual ban and unban
    try {
      const manualBanResponse = await testManualBan();
      if (manualBanResponse && manualBanResponse.success) {
        const testIP = '192.168.1.100';
        await testUnban(testIP);
      }
    } catch (err) {
      console.error('Error testing ban/unban:', err.message);
    }
    
    console.log('All security API tests completed!');
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the test
runTest();