/**
 * Test script to verify security headers on various routes
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';

// Helper function to display security headers
function displaySecurityHeaders(headers) {
  const securityHeaders = [
    'content-security-policy',
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
    'strict-transport-security',
    'referrer-policy',
    'x-permitted-cross-domain-policies',
    'x-dns-prefetch-control',
    'cross-origin-opener-policy',
    'cross-origin-resource-policy',
    'cross-origin-embedder-policy',
    'x-csp-applied-by',
    'x-csp-mode'
  ];

  console.log('Security Headers:');
  securityHeaders.forEach(header => {
    if (headers[header]) {
      console.log(`${header}: ${headers[header]}`);
    } else {
      console.log(`${header}: [not present]`);
    }
  });
  console.log('--------------------------');
}

async function testRoute(route, description) {
  console.log(`Testing ${description} at ${route}...`);
  
  try {
    const response = await axios.get(`${BASE_URL}${route}`);
    console.log(`Status: ${response.status}`);
    displaySecurityHeaders(response.headers);
    return response.headers;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      displaySecurityHeaders(error.response.headers);
      return error.response.headers;
    }
    return null;
  }
}

async function runTests() {
  console.log('Starting security headers test...');
  
  // Test main page
  await testRoute('/', 'Main page');
  
  // Test auth page
  await testRoute('/login', 'Login page');
  
  // Test API route
  await testRoute('/api/market/prices', 'API route');
  
  console.log('All tests completed!');
}

runTests().catch(error => {
  console.error('Test failed with error:', error);
});