/**
 * Test script to verify our two fixes are in place
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Check wouter version
function checkWouterVersion() {
  try {
    console.log("Checking wouter version...");
    const packageLockFile = fs.readFileSync('package-lock.json', 'utf8');
    const packageLock = JSON.parse(packageLockFile);
    
    const wouterVersion = packageLock.packages['node_modules/wouter'].version;
    console.log(`Current wouter version: ${wouterVersion}`);
    
    if (wouterVersion.startsWith('2.')) {
      console.log("✅ Wouter downgrade confirmed - this should fix the router-decoder issue");
      return true;
    } else {
      console.log("❌ Wouter version is NOT downgraded to v2.x as required");
      return false;
    }
  } catch (error) {
    console.error("Error checking wouter version:", error);
    return false;
  }
}

// Check PDF generator async fix
function checkPdfGeneratorAsyncFix() {
  try {
    console.log("Checking PDF generator async fix...");
    const pdfGeneratorFile = fs.readFileSync('client/src/utils/pdf-generator.ts', 'utf8');
    
    // Look for key patterns indicating our fix is in place
    const hasAwaitQrCode = pdfGeneratorFile.includes('await qrcode.toDataURL');
    const hasProperErrorHandling = pdfGeneratorFile.includes('try {') && 
                                   pdfGeneratorFile.includes('catch (error) {') && 
                                   pdfGeneratorFile.includes('console.error(\'QR code rendering error');
    const hasFinallyClause = pdfGeneratorFile.includes('finally {');
    
    console.log(`Async QR code generation: ${hasAwaitQrCode ? '✅' : '❌'}`);
    console.log(`Proper error handling: ${hasProperErrorHandling ? '✅' : '❌'}`);
    console.log(`Has finally clause: ${hasFinallyClause ? '✅' : '❌'}`);
    
    return hasAwaitQrCode && hasProperErrorHandling;
  } catch (error) {
    console.error("Error checking PDF generator async fix:", error);
    return false;
  }
}

// Check App.tsx routing fix
function checkAppTsxFix() {
  try {
    console.log("Checking App.tsx routing fix...");
    const appTsxFile = fs.readFileSync('client/src/App.tsx', 'utf8');
    
    // Check if customUseLocation references are removed
    const hasNoCustomUseLocation = !appTsxFile.includes('customUseLocation');
    const hasStandardImports = appTsxFile.includes('import { Route, Switch, useLocation } from "wouter";');
    
    console.log(`Removed customUseLocation: ${hasNoCustomUseLocation ? '✅' : '❌'}`);
    console.log(`Using standard imports: ${hasStandardImports ? '✅' : '❌'}`);
    
    return hasNoCustomUseLocation && hasStandardImports;
  } catch (error) {
    console.error("Error checking App.tsx fix:", error);
    return false;
  }
}

// Run all checks
function runVerification() {
  console.log("🔍 Running verification of fixes...");
  console.log("-----------------------------------");
  
  const wouterFixed = checkWouterVersion();
  console.log("-----------------------------------");
  
  const pdfFixed = checkPdfGeneratorAsyncFix();
  console.log("-----------------------------------");
  
  const appTsxFixed = checkAppTsxFix();
  console.log("-----------------------------------");
  
  console.log("SUMMARY:");
  console.log(`Wouter downgrade: ${wouterFixed ? '✅ FIXED' : '❌ NOT FIXED'}`);
  console.log(`PDF Generator async handling: ${pdfFixed ? '✅ FIXED' : '❌ NOT FIXED'}`);
  console.log(`App.tsx routing: ${appTsxFixed ? '✅ FIXED' : '❌ NOT FIXED'}`);
  console.log("-----------------------------------");
  
  if (wouterFixed && pdfFixed && appTsxFixed) {
    console.log("✅ All fixes are in place! The application should work correctly now.");
  } else {
    console.log("❌ Some fixes are missing. Please check the details above.");
  }
}

// Run the verification
runVerification();