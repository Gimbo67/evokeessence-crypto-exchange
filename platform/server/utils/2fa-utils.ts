import * as crypto from 'crypto';

/**
 * Generates random backup codes for two-factor authentication
 * @param count Number of backup codes to generate
 * @param length Length of each backup code (default: 8)
 * @returns Array of backup codes
 */
export function generateRandomCodes(count: number, length: number = 8): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate a random alphanumeric string
    const randomBytes = crypto.randomBytes(Math.ceil(length / 2));
    const code = randomBytes.toString('hex').slice(0, length).toUpperCase();
    
    // Format as XXXX-XXXX for better readability if length is 8 or more
    const formattedCode = length >= 8 
      ? `${code.slice(0, length/2)}-${code.slice(length/2)}`
      : code;
    
    codes.push(formattedCode);
  }
  
  return codes;
}

/**
 * Safely parses backup codes from various formats
 * @param codes Any value containing backup codes (string, array, or object)
 * @returns Array of backup codes or empty array if parsing fails
 */
export function parseBackupCodes(codes: any): string[] {
  // Enhanced debug logging
  console.log("Parsing backup codes, input type:", typeof codes);
  
  // Handle empty input
  if (!codes) {
    console.log("Empty backup codes input");
    return [];
  }
  
  // Case 1: If it's already an array - PostgreSQL jsonb may return a JavaScript array directly
  if (Array.isArray(codes)) {
    // Validate each element is a string with the expected format
    const validCodes = codes
      .filter(code => typeof code === 'string')
      .filter(code => /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code));
    
    console.log("Case 1: Array format - found", validCodes.length, "valid codes");
    // Only return codes if some valid ones were found
    if (validCodes.length > 0) {
      return validCodes;
    }
    
    // If no codes in expected format, try to reformat any that might be missing hyphens
    const reformattedCodes = codes
      .filter(code => typeof code === 'string')
      .map(code => {
        // Clean the code and ensure it's uppercase
        const cleaned = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        // If it's 8 characters, insert a hyphen in the middle
        if (cleaned.length === 8) {
          return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
        }
        return null;
      })
      .filter(Boolean) as string[];
    
    if (reformattedCodes.length > 0) {
      console.log("Case 1b: Reformatted array elements -", reformattedCodes.length, "codes");
      return reformattedCodes;
    }
  }
  
  // Case 2: PostgreSQL jsonb text representation: "[\"code1\", \"code2\"]"
  if (typeof codes === 'string') {
    console.log("Processing string format backup codes, length:", codes.length);
    
    // First, try standard JSON parse for any string that looks like JSON
    if ((codes.startsWith('[') && codes.endsWith(']')) || 
        (codes.startsWith('{') && codes.endsWith('}'))) {
      try {
        const parsedData = JSON.parse(codes);
        
        // If successfully parsed into an array, reprocess with this function
        if (Array.isArray(parsedData)) {
          console.log("Case 2a: Successfully parsed JSON string into array");
          return parseBackupCodes(parsedData); // Recursively handle the array
        }
        
        // If parsed to an object with a specific property containing the codes
        if (parsedData && typeof parsedData === 'object') {
          // Try common property names
          for (const prop of ['codes', 'backupCodes', 'backup_codes', 'data']) {
            if (Array.isArray(parsedData[prop])) {
              console.log(`Case 2b: Found backup codes in object property '${prop}'`);
              return parseBackupCodes(parsedData[prop]);
            }
          }
          
          // Try any array property
          for (const prop in parsedData) {
            if (Array.isArray(parsedData[prop])) {
              console.log(`Case 2c: Found array in object property '${prop}'`);
              return parseBackupCodes(parsedData[prop]);
            }
          }
          
          // Last resort: try stringifying the object and extract patterns
          console.log("Case 2d: Attempting to extract from stringified object");
          const stringified = JSON.stringify(parsedData);
          const regex = /[A-Z0-9]{4}-[A-Z0-9]{4}/gi;
          const matches = stringified.match(regex) || [];
          
          if (matches.length > 0) {
            console.log("Extracted", matches.length, "backup codes from stringified object");
            return matches;
          }
        }
      } catch (error) {
        console.error("JSON parse error:", (error as Error).message);
        // Continue to other parsing methods
      }
    }
    
    // Case 3: Look for escaped JSON formats
    // Example: "[\\\"8611-5250\\\", \\\"8971-08BC\\\"]"
    if (codes.includes('\\') && codes.includes('"')) {
      try {
        // First try to remove one level of escaping
        const unescaped = codes.replace(/\\\\/g, '\\').replace(/\\"/g, '"');
        const result = parseBackupCodes(unescaped);
        if (result.length > 0) {
          console.log("Case 3: Successfully unescaped string format");
          return result;
        }
      } catch (error) {
        console.error("Unescaping error:", (error as Error).message);
      }
    }
    
    // Case 4: Check for specific string patterns - start with CSV
    if (codes.includes(',')) {
      const splitCodes = codes.split(',').map(code => code.trim());
      // Filter for valid codes or those that can be reformatted
      const validCodes = splitCodes
        .map(code => {
          // Try to match the expected format directly
          if (/^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code)) {
            return code;
          }
          
          // Clean the code and try to reformat it
          const cleaned = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
          if (cleaned.length === 8) {
            return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
          }
          return null;
        })
        .filter(Boolean) as string[];
      
      if (validCodes.length > 0) {
        console.log("Case 4: Processed comma-separated list -", validCodes.length, "codes");
        return validCodes;
      }
    }
    
    // Case 5: Check for newline or space separated codes
    if (codes.includes('\n') || codes.includes('\r') || codes.includes(' ')) {
      // Split by any combination of spaces and newlines
      const splitCodes = codes.split(/[\s\r\n]+/).filter(Boolean);
      
      // Process each potential code
      const validCodes = splitCodes
        .map(code => {
          // Clean and format
          const cleaned = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
          if (cleaned.length === 8) {
            return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
          }
          // Check if already in correct format
          if (/^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code)) {
            return code;
          }
          return null;
        })
        .filter(Boolean) as string[];
      
      if (validCodes.length > 0) {
        console.log("Case 5: Processed newline/space separated list -", validCodes.length, "codes");
        return validCodes;
      }
    }
    
    // Case 6: Extract using regex pattern matching
    try {
      // First try the perfect format: XXXX-XXXX
      const perfectRegex = /[A-Z0-9]{4}-[A-Z0-9]{4}/gi;
      const perfectMatches = codes.match(perfectRegex) || [];
      
      if (perfectMatches.length > 0) {
        console.log("Case 6a: Found", perfectMatches.length, "perfectly formatted codes");
        return perfectMatches;
      }
      
      // Next try to find 8-character alphanumeric sequences without hyphens
      const plainRegex = /[A-Z0-9]{8}/gi;
      const plainMatches = codes.match(plainRegex) || [];
      
      // Format them with hyphens
      const formattedMatches = plainMatches.map(
        code => `${code.slice(0, 4)}-${code.slice(4)}`
      );
      
      if (formattedMatches.length > 0) {
        console.log("Case 6b: Found and formatted", formattedMatches.length, "non-hyphenated codes");
        return formattedMatches;
      }
    } catch (error) {
      console.error("Regex extraction error:", (error as Error).message);
    }
  }
  
  // Case 7: Handle other object types by stringifying
  if (typeof codes === 'object' && codes !== null) {
    try {
      console.log("Case 7: Processing generic object");
      // Try to convert to string and extract
      const codesString = JSON.stringify(codes);
      
      // First try the standard format
      const standardRegex = /[A-Z0-9]{4}-[A-Z0-9]{4}/gi;
      const standardMatches = codesString.match(standardRegex) || [];
      
      if (standardMatches.length > 0) {
        console.log("Case 7a: Found", standardMatches.length, "standard format codes in object");
        return standardMatches;
      }
      
      // Try finding 8-char sequences without hyphens
      const plainRegex = /[A-Z0-9]{8}/gi;
      const plainMatches = codesString.match(plainRegex) || [];
      
      // Format them with hyphens
      const formattedMatches = plainMatches.map(
        code => `${code.slice(0, 4)}-${code.slice(4)}`
      );
      
      if (formattedMatches.length > 0) {
        console.log("Case 7b: Found and formatted", formattedMatches.length, "non-hyphenated codes in object");
        return formattedMatches;
      }
      
      // If the object has a property that might contain the codes
      if ('backupCodes' in codes || 'backup_codes' in codes || 'codes' in codes) {
        const propName = 'backupCodes' in codes ? 'backupCodes' : 
                         'backup_codes' in codes ? 'backup_codes' : 'codes';
                         
        console.log(`Case 7c: Found potential '${propName}' property in object`);
        const result = parseBackupCodes(codes[propName]);
        if (result.length > 0) {
          return result;
        }
      }
    } catch (error) {
      console.error("Object processing error:", (error as Error).message);
    }
  }
  
  // As a last resort, if we know this is supposed to be a backup codes field
  // but parsing failed, generate temporary codes (for debugging only)
  console.error("All backup code parsing methods failed, input type:", typeof codes);
  if (typeof codes !== 'undefined' && codes !== null) {
    // Log but truncate long values
    const debugValue = typeof codes === 'string' 
      ? (codes.length > 100 ? codes.substring(0, 100) + '...' : codes)
      : codes;
    console.error("Backup codes raw value:", debugValue);
  }
  
  // Return empty array to avoid null errors in the app
  return [];
}

/**
 * Validates if a string is a valid OTP token
 * @param token The token to validate
 * @returns Boolean indicating if token has valid format
 */
export function isValidToken(token: string): boolean {
  // OTP tokens are typically 6 digits
  return /^\d{6}$/.test(token);
}

/**
 * Checks if a string is likely a backup code
 * @param code Code to check
 * @returns Boolean indicating if code is likely a backup code
 */
export function isBackupCode(code: string): boolean {
  // Backup codes are typically formatted as XXXX-XXXX
  // Account for entries with or without the hyphen
  const normalizedCode = code.replace('-', '');
  
  // Check if it's the right length and alphanumeric
  return /^[A-Z0-9]{8}$/i.test(normalizedCode);
}

/**
 * Safely compares two strings in constant time to prevent timing attacks
 * @param a First string
 * @param b Second string
 * @returns Boolean indicating if strings are equal
 */
export function secureCompare(a: string, b: string): boolean {
  // Use Node.js's crypto.timingSafeEqual for constant-time comparison
  // This prevents timing attacks that could be used to deduce backup codes
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    
    // Ensure buffers are of equal length to avoid errors
    if (bufA.length !== bufB.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (error) {
    // If anything goes wrong, return false
    return false;
  }
}

/**
 * Validates a backup code against an array of valid codes
 * @param inputCode The code to validate
 * @param validCodes Array of valid backup codes
 * @returns Index of the matched code or -1 if no match
 */
export function validateBackupCode(inputCode: string, validCodes: string[]): number {
  // Normalize the input code (remove hyphen if present)
  const normalizedInput = inputCode.replace('-', '').toUpperCase();
  
  // Check against each valid code
  for (let i = 0; i < validCodes.length; i++) {
    const normalizedValidCode = validCodes[i].replace('-', '').toUpperCase();
    if (secureCompare(normalizedInput, normalizedValidCode)) {
      return i; // Return the index of the matched code
    }
  }
  
  return -1; // No match found
}