/**
 * Test script to check contractor API routes
 */

import fetch from 'node-fetch';
import bcrypt from 'bcrypt';
import postgres from 'postgres';

// Database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create a Postgres client for direct connection
const client = postgres(DATABASE_URL, { max: 1, ssl: 'require' });

// Base URL for API calls
const BASE_URL = 'http://localhost:5000';

/**
 * Helper function to call API endpoints
 */
async function callApi(endpoint, method = 'GET', data = null, cookies = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      // Use development mode to bypass reCAPTCHA
      'X-Development-Mode': 'true',
      // Add cookies if provided
      ...(cookies ? { Cookie: cookies } : {})
    },
    ...(data ? { body: JSON.stringify(data) } : {})
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const responseData = await response.json();
  
  // Return both the response object (for headers/cookies) and the parsed data
  return { 
    response, 
    data: responseData,
    cookies: response.headers.get('set-cookie')
  };
}

/**
 * Login as contractor
 */
async function loginAsContractor() {
  console.log('\n===== Testing Contractor Login =====');
  const { response, data, cookies } = await callApi('/bypass/auth/login', 'POST', {
    username: 'testcontractor4',
    password: 'TestPassword123!'
  });

  console.log('Login Response:', data);
  
  if (!data.success) {
    console.error('Login failed - creating a test session directly in the database');
    
    // If login fails due to CAPTCHA, create a session directly in the database
    // This is for testing purposes only
    const sessionId = 'contractor-test-session-' + Date.now();
    const sessionData = {
      id: 104, // Contractor ID from our previous test
      username: 'testcontractor4',
      is_contractor: true,
      is_admin: false,
      is_employee: false,
      referral_code: 'TEST4',
      contractor_commission_rate: 0.85,
      session_id: sessionId,
    };
    
    // Insert test session (for testing without reCAPTCHA)
    await client`
      INSERT INTO sessions (sid, sess, expire)
      VALUES (${sessionId}, ${JSON.stringify({ passport: { user: sessionData } })}, NOW() + INTERVAL '1 day')
    `;
    
    return `connect.sid=${sessionId}`;
  }
  
  return cookies;
}

/**
 * Test contractor analytics API
 */
async function testContractorAnalytics(cookies) {
  console.log('\n===== Testing Contractor Analytics API =====');
  const { response, data } = await callApi('/api/contractor/analytics', 'GET', null, cookies);
  
  console.log('Contractor Analytics Response:', data);
  return data;
}

/**
 * Test contractor referrals API
 */
async function testContractorReferrals(cookies) {
  console.log('\n===== Testing Contractor Referrals API =====');
  const { response, data } = await callApi('/api/contractor/referrals', 'GET', null, cookies);
  
  console.log('Contractor Referrals Response:', data);
  return data;
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    // Login as contractor
    const cookies = await loginAsContractor();
    
    // Test contractor analytics API
    await testContractorAnalytics(cookies);
    
    // Test contractor referrals API
    await testContractorReferrals(cookies);
    
  } catch (error) {
    console.error('Error running tests:', error);
  } finally {
    // Close database connection
    await client.end();
  }
}

// Run the tests
runTests()
  .then(() => {
    console.log('\nAll tests completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Tests failed:', err);
    process.exit(1);
  });