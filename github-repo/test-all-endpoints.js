/**
 * API Endpoint Validation Test Utility
 * 
 * This script tests all API endpoints in the OpenAPI schema to ensure they are 
 * properly set up and responding with valid Content-Type headers and response formats.
 * 
 * Usage: node test-all-endpoints.js [optional: specific-endpoint]
 */

import fetch from 'node-fetch';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:5000';
const SCHEMA_PATH = path.join(__dirname, 'openapi-schema.yaml');

// Load OpenAPI schema
const loadSchema = () => {
  try {
    const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');
    return yaml.load(schemaContent);
  } catch (error) {
    console.error('Error loading schema:', error.message);
    process.exit(1);
  }
};

// Extract endpoints from OpenAPI schema
const extractEndpoints = (schema) => {
  const endpoints = [];
  
  for (const path in schema.paths) {
    const methods = schema.paths[path];
    
    for (const method in methods) {
      if (method !== 'parameters') {  // Skip global parameters
        endpoints.push({
          path,
          method: method.toUpperCase(),
          tag: methods[method].tags?.[0] || 'untagged',
          description: methods[method].summary || methods[method].description || 'No description'
        });
      }
    }
  }
  
  return endpoints;
};

// Test an individual endpoint
const testEndpoint = async (endpoint) => {
  console.log(`\n🔍 Testing ${endpoint.method} ${endpoint.path}`);
  console.log(`   Description: ${endpoint.description}`);
  console.log(`   Tag: ${endpoint.tag}`);
  
  try {
    // Most of our endpoints are GET, but for those that are not, we'll show what would be needed
    if (endpoint.method !== 'GET') {
      console.log(`   ⚠️ Skipping ${endpoint.method} endpoint - only testing GET endpoints automatically`);
      return { success: false, skipped: true, reason: `${endpoint.method} endpoint not tested` };
    }
    
    // Skip IDs that require parameters
    if (endpoint.path.includes('{') && endpoint.path.includes('}')) {
      console.log(`   ⚠️ Skipping endpoint with path parameters: ${endpoint.path}`);
      return { success: false, skipped: true, reason: 'Path requires parameters' };
    }
    
    // Make the request
    console.log(`   📡 Sending request to ${BASE_URL}${endpoint.path}...`);
    const response = await fetch(`${BASE_URL}${endpoint.path}`, {
      method: endpoint.method,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    // Check status code
    const statusOk = response.status >= 200 && response.status < 500;
    const statusText = statusOk ? '✓' : '❌';
    console.log(`   ${statusText} Status: ${response.status} ${response.statusText}`);
    
    // Check Content-Type header
    const contentType = response.headers.get('content-type');
    const contentTypeOk = contentType && contentType.includes('application/json');
    const contentTypeText = contentTypeOk ? '✓' : '❌';
    console.log(`   ${contentTypeText} Content-Type: ${contentType || 'not set'}`);
    
    // Attempt to parse JSON
    let body;
    let jsonOk = false;
    
    try {
      body = await response.json();
      jsonOk = true;
      console.log(`   ✓ Valid JSON response`);
      
      // Check structure
      if (body && typeof body === 'object') {
        if (Array.isArray(body)) {
          console.log(`   ✓ Response is a valid JSON array with ${body.length} items`);
        } else if (body.hasOwnProperty('data') || body.hasOwnProperty('error') || 
                  body.hasOwnProperty('message') || body.hasOwnProperty('success') ||
                  body.hasOwnProperty('status')) {
          console.log(`   ✓ Response follows consistent schema format`);
        } else {
          console.log(`   ⚠️ Response structure might not follow schema guidelines`);
        }
      }
    } catch (e) {
      console.log(`   ❌ Invalid JSON response: ${e.message}`);
    }
    
    return {
      success: statusOk && contentTypeOk && jsonOk,
      status: response.status,
      contentType,
      body
    };
  } catch (error) {
    console.error(`   ❌ Request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Main function
const main = async () => {
  console.log('API Endpoint Validation Test Utility');
  console.log('==================================');
  
  // Load schema
  const schema = loadSchema();
  if (!schema) {
    console.error('Failed to load schema');
    return;
  }
  
  console.log(`Loaded schema: ${schema.info.title} v${schema.info.version}`);
  
  // Extract endpoints
  const endpoints = extractEndpoints(schema);
  console.log(`Found ${endpoints.length} endpoints in schema`);
  
  // Check if a specific endpoint was requested
  const specificEndpoint = process.argv[2];
  let endpointsToTest = endpoints;
  
  if (specificEndpoint) {
    endpointsToTest = endpoints.filter(e => e.path.includes(specificEndpoint));
    console.log(`Testing only endpoints matching "${specificEndpoint}" - found ${endpointsToTest.length} matches`);
    
    if (endpointsToTest.length === 0) {
      console.log(`No endpoints found matching "${specificEndpoint}"`);
      return;
    }
  }
  
  // Group endpoints by tag for better organization
  const groupedEndpoints = {};
  endpointsToTest.forEach(endpoint => {
    if (!groupedEndpoints[endpoint.tag]) {
      groupedEndpoints[endpoint.tag] = [];
    }
    groupedEndpoints[endpoint.tag].push(endpoint);
  });
  
  // Summary stats
  let totalTested = 0;
  let totalPassed = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  
  // Test each group of endpoints
  for (const tag in groupedEndpoints) {
    console.log(`\n=== Testing ${tag} endpoints (${groupedEndpoints[tag].length}) ===`);
    
    for (const endpoint of groupedEndpoints[tag]) {
      const result = await testEndpoint(endpoint);
      totalTested++;
      
      if (result.skipped) {
        totalSkipped++;
      } else if (result.success) {
        totalPassed++;
      } else {
        totalFailed++;
      }
    }
  }
  
  // Print summary
  console.log('\n=== Test Summary ===');
  console.log(`Total endpoints tested: ${totalTested}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Skipped: ${totalSkipped}`);
  console.log(`Failed: ${totalFailed}`);
  
  // Overall result
  if (totalFailed === 0) {
    console.log('\n✅ All tests passed or were skipped successfully!');
  } else {
    console.log(`\n❌ ${totalFailed} tests failed.`);
  }
};

// Execute the script
main().catch(console.error);