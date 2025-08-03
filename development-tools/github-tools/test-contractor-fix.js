/**
 * Test script to verify the contractor deposit tracking fix
 * This script tests if deposits with referral codes are properly assigned to contractors
 */

import postgres from 'postgres';
import axios from 'axios';

// Database connection
const DATABASE_URL = process.env.DATABASE_URL;

// Create a Postgres client for direct connection
const client = postgres(DATABASE_URL, { max: 1, ssl: 'require' });

// Create Test User Constants
const TEST_USERNAME = 'test000';
const TEST_REFERRAL_CODE = 'A64S';  // Referral code for contractor "andreavass"
const TEST_DEPOSIT_AMOUNT = 1000;

/**
 * Helper function to call API endpoints
 */
async function callApi(endpoint, method = 'GET', data = null, cookies = null) {
  const headers = {};
  if (cookies) {
    headers.Cookie = cookies;
  }

  try {
    const response = await axios({
      method,
      url: `http://localhost:5000${endpoint}`,
      data,
      headers,
      withCredentials: true
    });
    return response.data;
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

async function loginAsContractor() {
  try {
    console.log('Using bypass route to login as contractor andreavass...');
    
    // Use bypass route for testing
    const bypassResponse = await callApi('/bypass/login?username=andreavass', 'GET');
    
    console.log('Bypass login successful');
    
    // Extract cookie
    const cookies = 'connect.sid=' + bypassResponse.sessionID;
    return cookies;
  } catch (error) {
    console.error('Bypass login failed:', error);
    return null;
  }
}

async function checkTestUser() {
  console.log(`\nChecking if test user ${TEST_USERNAME} exists...`);
  const userResult = await client`
    SELECT id, username, referred_by
    FROM users
    WHERE username = ${TEST_USERNAME}
  `;
  
  if (userResult.length === 0) {
    console.log(`Test user ${TEST_USERNAME} not found.`);
    return false;
  }
  
  console.log(`Found test user:`, userResult[0]);
  return true;
}

async function checkDeposits() {
  console.log(`\nChecking for deposits with referral code ${TEST_REFERRAL_CODE}...`);
  const depositsResult = await client`
    SELECT 
      id, 
      user_id as "userId", 
      amount, 
      currency, 
      status, 
      commission_fee as "commissionFee", 
      referral_code as "referralCode", 
      contractor_id as "contractorId", 
      contractor_commission as "contractorCommission"
    FROM sepa_deposits 
    WHERE referral_code = ${TEST_REFERRAL_CODE}
  `;
  
  console.log(`Found ${depositsResult.length} deposits with this referral code`);
  depositsResult.forEach(deposit => {
    console.log(`- Deposit ID: ${deposit.id}, Amount: ${deposit.amount} ${deposit.currency}, Status: ${deposit.status}`);
  });
  
  return depositsResult;
}

async function getContractorAnalytics(cookies) {
  try {
    console.log('\nFetching contractor analytics...');
    const analyticsResponse = await callApi('/api/contractor/analytics', 'GET', null, cookies);
    
    // Check for deposits in the analytics
    const referredDeposits = analyticsResponse.referredDeposits || [];
    console.log(`Found ${referredDeposits.length} referred deposits in analytics`);
    
    // Look specifically for the test000 user's deposit
    const testUserDeposits = referredDeposits.filter(d => d.username === TEST_USERNAME);
    if (testUserDeposits.length > 0) {
      console.log(`Found ${testUserDeposits.length} deposits for user ${TEST_USERNAME}:`);
      testUserDeposits.forEach(deposit => {
        console.log(`- Deposit ID: ${deposit.id}, Amount: ${deposit.amount} ${deposit.currency}, Status: ${deposit.status}`);
      });
    } else {
      console.log(`No deposits found for user ${TEST_USERNAME} in analytics.`);
    }
    
    return analyticsResponse;
  } catch (error) {
    console.error('Error fetching contractor analytics:', error);
    return null;
  }
}

async function getContractorDeposits(cookies) {
  try {
    console.log('\nFetching contractor deposits...');
    const depositsResponse = await callApi('/api/contractor/deposits', 'GET', null, cookies);
    
    console.log(`Contractor deposits API returned ${depositsResponse.length} deposits`);
    
    // Look specifically for the test000 user's deposit
    const testUserDeposits = depositsResponse.filter(d => d.clientUsername === TEST_USERNAME);
    if (testUserDeposits.length > 0) {
      console.log(`Found ${testUserDeposits.length} deposits for user ${TEST_USERNAME} in deposits API:`);
      testUserDeposits.forEach(deposit => {
        console.log(`- Deposit ID: ${deposit.id}, Amount: ${deposit.amount} ${deposit.currency}, Status: ${deposit.status}`);
      });
    } else {
      console.log(`No deposits found for user ${TEST_USERNAME} in deposits API.`);
    }
    
    return depositsResponse;
  } catch (error) {
    console.error('Error fetching contractor deposits:', error);
    return null;
  }
}

async function runTest() {
  try {
    // Check if test user exists in database
    const userExists = await checkTestUser();
    
    // Check deposits in database
    const deposits = await checkDeposits();
    
    // Login as contractor
    const cookies = await loginAsContractor();
    if (!cookies) {
      console.error('Could not login as contractor. Aborting test.');
      return;
    }
    
    // Test contractor analytics endpoint
    await getContractorAnalytics(cookies);
    
    // Test contractor deposits endpoint
    await getContractorDeposits(cookies);
    
    console.log('\nTest completed successfully.');
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    await client.end();
  }
}

runTest();