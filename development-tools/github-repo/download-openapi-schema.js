/**
 * Simple script to extract the OpenAPI schema files for download
 * Run with:
 * node download-openapi-schema.js
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to read a file
function readFile(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return null;
  }
}

console.log('OpenAPI Schema Download Helper');
console.log('============================');

// Read the YAML schema
const yamlPath = join(__dirname, 'openapi-schema.yaml');
const yamlContent = readFile(yamlPath);

if (yamlContent) {
  console.log('YAML Schema:');
  console.log('-----------');
  console.log(yamlContent);
  console.log('-----------');
}

// Read the JSON schema
const jsonPath = join(__dirname, 'openapi-schema.json');
const jsonContent = readFile(jsonPath);

if (jsonContent) {
  console.log('\nJSON Schema:');
  console.log('-----------');
  console.log(jsonContent);
  console.log('-----------');
}

console.log('\nHow to download:');
console.log('1. Copy the schema content (YAML or JSON) from above');
console.log('2. Paste it into a local file on your computer');
console.log('3. Save the file as either "openapi-schema.yaml" or "openapi-schema.json"');
console.log('4. Upload this file to Cloudflare\'s API Schema Validation section');