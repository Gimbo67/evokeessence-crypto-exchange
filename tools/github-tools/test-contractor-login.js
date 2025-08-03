/**
 * Test script to verify contractor login functionality and information preservation
 */
import fetch from 'node-fetch';
import * as fs from 'fs';

const BASE_URL = 'http://localhost:5000';
const API_LOGIN = `${BASE_URL}/api/auth/login`;
const API_USER = `${BASE_URL}/api/user`;
const API_CONTRACTOR_ANALYTICS = `${BASE_URL}/api/contractor/analytics`;

// Use our test contractor account
const CONTRACTOR_USERNAME = 'testcontractor'; // Test contractor account
const CONTRACTOR_PASSWORD = 'Testpass123'; // Password that matches the bcrypt hash
const REFERRAL_CODE = 'TEST1'; // Expected referral code

/**
 * Login as a contractor user
 */
async function loginAsContractor() {
  console.log(`Attempting to login as contractor: ${CONTRACTOR_USERNAME}`);
  
  try {
    const response = await fetch(API_LOGIN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: CONTRACTOR_USERNAME,
        password: CONTRACTOR_PASSWORD,
        recaptchaToken: 'bypass-token', // Development bypass
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Login failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Login response:`, {
      username: data.username,
      isContractor: data.isContractor,
      referralCode: data.referralCode,
      contractorCommissionRate: data.contractorCommissionRate,
    });
    
    if (!data.isContractor) {
      console.error('ERROR: User is not marked as a contractor in login response!');
    }
    
    if (data.referralCode !== REFERRAL_CODE) {
      console.error(`ERROR: Referral code mismatch! Expected ${REFERRAL_CODE}, got ${data.referralCode}`);
    }
    
    // Save cookies for subsequent requests
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      fs.writeFileSync('contractor_cookie.txt', cookies);
      console.log('Cookies saved for contractor session');
    }
    
    return cookies;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Check user session info
 */
async function checkUserInfo(cookies) {
  console.log('Checking user info from session endpoint...');
  
  try {
    const response = await fetch(API_USER, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Session check failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`User session data:`, {
      username: data.username,
      isContractor: data.isContractor,
      is_contractor: data.is_contractor,
      referralCode: data.referralCode,
      contractorCommissionRate: data.contractorCommissionRate,
    });
    
    if (!data.isContractor) {
      console.error('ERROR: User is not marked as a contractor in session!');
    }
    
    if (data.referralCode !== REFERRAL_CODE) {
      console.error(`ERROR: Referral code mismatch in session! Expected ${REFERRAL_CODE}, got ${data.referralCode}`);
    }
    
    return data;
  } catch (error) {
    console.error('Session check error:', error);
    throw error;
  }
}

/**
 * Check contractor analytics endpoint
 */
async function checkContractorAnalytics(cookies) {
  console.log('Checking contractor analytics endpoint...');
  
  try {
    const response = await fetch(API_CONTRACTOR_ANALYTICS, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Analytics fetch failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Contractor analytics data:', data);
    
    // Verify data structure
    if (!data.referralCode || data.referralCode !== REFERRAL_CODE) {
      console.error(`ERROR: Analytics endpoint missing or incorrect referral code. Expected ${REFERRAL_CODE}, got ${data.referralCode}`);
    }
    
    if (typeof data.referredClientsCount !== 'number') {
      console.error('ERROR: Analytics missing referredClientsCount field');
    }
    
    if (typeof data.totalReferredDeposits !== 'number') {
      console.error('ERROR: Analytics missing totalReferredDeposits field');
    }
    
    if (typeof data.commissionAmount !== 'number') {
      console.error('ERROR: Analytics missing commissionAmount field');
    }
    
    return data;
  } catch (error) {
    console.error('Analytics fetch error:', error);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    console.log('== Starting Contractor Login & Session Test ==');
    
    // Login
    const cookies = await loginAsContractor();
    
    // Check user info
    const userData = await checkUserInfo(cookies);
    
    // Check analytics endpoint
    const analyticsData = await checkContractorAnalytics(cookies);
    
    console.log('== Test Results Summary ==');
    console.log(`User marked as contractor: ${userData.isContractor ? 'YES ✓' : 'NO ✗'}`);
    console.log(`Referral code preserved: ${userData.referralCode === REFERRAL_CODE ? 'YES ✓' : 'NO ✗'}`);
    console.log(`Analytics endpoint accessible: ${analyticsData ? 'YES ✓' : 'NO ✗'}`);
    
    console.log('== Tests completed ==');
  } catch (error) {
    console.error('Test run error:', error);
  }
}

// Run the tests
runTests();