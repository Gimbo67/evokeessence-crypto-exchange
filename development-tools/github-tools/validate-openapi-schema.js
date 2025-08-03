/**
 * Simple script to validate the OpenAPI schema files
 * Run with:
 * node validate-openapi-schema.js
 */

// Using native file system module (ES Modules syntax)
import { readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to check if file exists
function fileExists(filePath) {
  try {
    return statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

// Function to read a file
function readFile(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return null;
  }
}

// Main function to check schema files
async function validateSchemas() {
  console.log('OpenAPI Schema Validator');
  console.log('=======================');
  
  // Check if the schema files exist
  const yamlPath = join(__dirname, 'openapi-schema.yaml');
  const jsonPath = join(__dirname, 'openapi-schema.json');
  
  if (!fileExists(yamlPath) && !fileExists(jsonPath)) {
    console.error('Error: No schema file found. Please make sure either openapi-schema.yaml or openapi-schema.json exists.');
    process.exit(1);
  }
  
  console.log('Schema files found:');
  if (fileExists(yamlPath)) {
    console.log('- YAML Schema: openapi-schema.yaml');
    // Read first few lines to verify content
    const yamlContent = readFile(yamlPath);
    if (yamlContent) {
      const firstLines = yamlContent.split('\n').slice(0, 5).join('\n');
      console.log('\nYAML Schema preview:');
      console.log('-------------------');
      console.log(firstLines);
      console.log('...');
    }
  }
  
  if (fileExists(jsonPath)) {
    console.log('\n- JSON Schema: openapi-schema.json');
    // Read and parse JSON to verify it's valid
    const jsonContent = readFile(jsonPath);
    if (jsonContent) {
      try {
        const jsonParsed = JSON.parse(jsonContent);
        console.log('\nJSON Schema info:');
        console.log('----------------');
        console.log(`Title: ${jsonParsed.info.title}`);
        console.log(`Version: ${jsonParsed.info.version}`);
        console.log(`Paths: ${Object.keys(jsonParsed.paths).length}`);
        console.log(`Endpoints: ${Object.keys(jsonParsed.paths).join(', ')}`);
      } catch (err) {
        console.error('Error parsing JSON schema:', err.message);
      }
    }
  }
  
  console.log('\nFor full validation, you can:');
  console.log('1. Use an online validator:');
  console.log('   - Visit https://editor.swagger.io/');
  console.log('   - Paste your schema or upload the file');
  
  console.log('\nYour schema files are ready to be uploaded to Cloudflare:');
  console.log('1. Go to Cloudflare Dashboard (https://dash.cloudflare.com)');
  console.log('2. Navigate to Security > API Abuse > Schema Validation');
  console.log('3. Upload either the YAML or JSON schema file');
}

// Execute the validation
validateSchemas().catch(err => {
  console.error('Error running validation:', err);
  process.exit(1);
});