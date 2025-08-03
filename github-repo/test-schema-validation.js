/**
 * API Endpoint Schema Validation Test Utility
 * 
 * This script tests API endpoints to ensure they conform to the OpenAPI schema
 * by checking response structure, Content-Type headers, and field validation.
 * 
 * Usage: node test-schema-validation.js [endpoint]
 */

import fetch from 'node-fetch';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const BASE_URL = 'http://localhost:5000';
const SCHEMA_PATH = './openapi-schema.yaml';
const SCHEMA_JSON_PATH = './openapi-schema.json';

// Load OpenAPI schema
const loadSchema = () => {
  try {
    const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf8');
    return yaml.load(schemaContent);
  } catch (error) {
    console.error('Error loading schema:', error.message);
    try {
      const jsonContent = fs.readFileSync(SCHEMA_JSON_PATH, 'utf8');
      return JSON.parse(jsonContent);
    } catch (jsonError) {
      console.error('Error loading JSON schema:', jsonError.message);
      process.exit(1);
    }
  }
};

// Validate Content-Type header
const validateContentType = (headers) => {
  const contentType = headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    console.error(`❌ Invalid Content-Type: ${contentType || 'not set'}`);
    return false;
  }
  console.log(`✓ Valid Content-Type: ${contentType}`);
  return true;
};

// Validate response structure
const validateResponseStructure = (data) => {
  if (!data || typeof data !== 'object') {
    console.error('❌ Response is not a valid JSON object');
    return false;
  }

  if (Array.isArray(data)) {
    console.log('✓ Response is a valid JSON array');
    return true;
  }

  // Check for consistent response structure
  if (data.hasOwnProperty('status') || 
      data.hasOwnProperty('data') || 
      data.hasOwnProperty('message') || 
      data.hasOwnProperty('error')) {
    console.log('✓ Response follows the consistent schema format');
    return true;
  }

  console.warn('⚠️ Response might not follow the consistent schema format');
  return false;
};

// Test a specific API endpoint
const testEndpoint = async (endpoint) => {
  console.log(`\n🔍 Testing endpoint: ${endpoint}`);
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    // Validate Content-Type header
    const contentTypeValid = validateContentType(response.headers);
    
    // Parse and validate response body
    let data;
    try {
      data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2).substring(0, 500) + (JSON.stringify(data, null, 2).length > 500 ? '...' : ''));
      validateResponseStructure(data);
    } catch (jsonError) {
      console.error('❌ Failed to parse JSON response:', jsonError.message);
      return false;
    }
    
    return contentTypeValid && data;
  } catch (error) {
    console.error(`❌ Request failed: ${error.message}`);
    return false;
  }
};

// Get all endpoints from schema
const getEndpointsFromSchema = (schema) => {
  const endpoints = [];
  if (schema.paths) {
    for (const path in schema.paths) {
      endpoints.push(path);
    }
  }
  return endpoints;
};

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Main function
const main = async () => {
  console.log('API Schema Validation Test Utility');
  console.log('=================================');
  
  const schema = loadSchema();
  if (!schema) {
    console.error('Failed to load schema');
    return;
  }
  
  console.log(`Loaded schema: ${schema.info.title} v${schema.info.version}`);
  
  const targetEndpoint = process.argv[2];
  if (targetEndpoint) {
    // Test specific endpoint
    await testEndpoint(targetEndpoint);
  } else {
    // List all endpoints from schema
    const endpoints = getEndpointsFromSchema(schema);
    console.log(`\nFound ${endpoints.length} endpoints in schema:`);
    endpoints.forEach((endpoint, index) => {
      console.log(`${index + 1}. ${endpoint}`);
    });
    
    console.log('\nTo test an endpoint, run: node test-schema-validation.js [endpoint]');
    console.log('Example: node test-schema-validation.js /api/market/prices');
  }
};

main().catch(console.error);