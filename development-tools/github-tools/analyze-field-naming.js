/**
 * This script scans the codebase for potential database field naming inconsistencies
 * It looks for camelCase vs snake_case mismatches in field access patterns
 */

import fs from 'fs/promises';
import path from 'path';

// Common database field names that might appear in camelCase and snake_case
const fieldPairs = [
  ['userId', 'user_id'],
  ['fullName', 'full_name'],
  ['createdAt', 'created_at'],
  ['updatedAt', 'updated_at'],
  ['profileImage', 'profile_image'],
  ['isAdmin', 'is_admin'],
  ['isEmployee', 'is_employee'],
  ['userGroup', 'user_group'],
  ['kycStatus', 'kyc_status'],
  ['balanceCurrency', 'balance_currency'],
  ['emailVerified', 'email_verified'],
  ['phoneNumber', 'phone_number'],
  ['twoFactorEnabled', 'two_factor_enabled'],
  ['twoFactorSecret', 'two_factor_secret'],
  ['backupCodes', 'backup_codes'],
  ['recoveryEmail', 'recovery_email'],
  ['permissionType', 'permission_type'],
  ['lastLogin', 'last_login'],
  ['passwordResetToken', 'password_reset_token'],
  ['passwordResetExpires', 'password_reset_expires'],
  ['documentType', 'document_type'],
  ['documentNumber', 'document_number'],
  ['documentStatus', 'document_status'],
  ['documentPath', 'document_path'],
  ['documentVerified', 'document_verified'],
  ['transactionId', 'transaction_id'],
  ['transactionType', 'transaction_type'],
  ['transactionAmount', 'transaction_amount'],
  ['transactionStatus', 'transaction_status'],
  ['referenceNumber', 'reference_number'],
  ['accountNumber', 'account_number'],
  ['commissionRate', 'commission_rate'],
  ['commissionAmount', 'commission_amount'],
  ['initialAmount', 'initial_amount'],
  ['totalAmount', 'total_amount'],
  ['txHash', 'tx_hash'],
  ['cryptoAddress', 'crypto_address'],
  ['adminComments', 'admin_comments'],
  ['verificationCode', 'verification_code'],
  ['codeExpires', 'code_expires'],
  ['verificationStatus', 'verification_status'],
  ['signupDate', 'signup_date'],
  ['twoFactorVerified', 'two_factor_verified'],
  ['requestType', 'request_type'],
  ['requestStatus', 'request_status'],
  ['requestDetails', 'request_details'],
  ['profileUpdated', 'profile_updated']
];

async function scanDirectory(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  
  let results = [];
  
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and other irrelevant directories
      if (['node_modules', '.git', 'public', 'dist', 'build'].includes(entry.name)) {
        continue;
      }
      
      // Recursively scan subdirectories
      const subResults = await scanDirectory(fullPath);
      results = [...results, ...subResults];
    } else if (entry.isFile()) {
      // Check files with relevant extensions
      const ext = path.extname(entry.name).toLowerCase();
      if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
        const fileResults = await analyzeFile(fullPath);
        results = [...results, ...fileResults];
      }
    }
  }
  
  return results;
}

async function analyzeFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const results = [];
    
    // Check each field pair for inconsistencies
    for (const [camelCase, snakeCase] of fieldPairs) {
      // Count occurrences 
      const camelCount = (content.match(new RegExp(`\\.${camelCase}\\b|"${camelCase}"|\\'${camelCase}\\'|\\s${camelCase}:\\s|\\s${camelCase},`, 'g')) || []).length;
      const snakeCount = (content.match(new RegExp(`\\.${snakeCase}\\b|"${snakeCase}"|\\'${snakeCase}\\'|\\s${snakeCase}:\\s|\\s${snakeCase},`, 'g')) || []).length;
      
      // If both versions are found, it might indicate inconsistency
      if (camelCount > 0 && snakeCount > 0) {
        results.push({
          file: filePath,
          camelCase,
          snakeCase,
          camelCount,
          snakeCount
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error(`Error analyzing file ${filePath}:`, error.message);
    return [];
  }
}

async function main() {
  try {
    // Start scanning from the current directory
    const results = await scanDirectory('.');
    
    // Count total inconsistencies
    console.log(`Found ${results.length} potential field naming inconsistencies`);
    
    // Group results by file
    const fileGroups = {};
    for (const result of results) {
      if (!fileGroups[result.file]) {
        fileGroups[result.file] = [];
      }
      fileGroups[result.file].push(result);
    }
    
    // Print results grouped by file
    for (const file in fileGroups) {
      console.log(`\nFile: ${file}`);
      for (const result of fileGroups[file]) {
        console.log(`  - ${result.camelCase} (${result.camelCount}) vs ${result.snakeCase} (${result.snakeCount})`);
      }
    }
    
    // Find the most common inconsistencies
    const fieldCounts = {};
    for (const result of results) {
      const key = `${result.camelCase} vs ${result.snakeCase}`;
      if (!fieldCounts[key]) {
        fieldCounts[key] = 0;
      }
      fieldCounts[key]++;
    }
    
    console.log('\nMost common inconsistencies:');
    const sortedFields = Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]);
    for (const [field, count] of sortedFields.slice(0, 10)) {
      console.log(`  - ${field}: ${count} occurrences`);
    }
    
  } catch (error) {
    console.error('Error scanning codebase:', error.message);
  }
}

main();