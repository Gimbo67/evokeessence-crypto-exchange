/**
 * This script tests the 2FA validation with the same algorithm as used in authenticator apps
 * It can be used to verify that the backend validation matches what authenticator apps would generate
 */

import speakeasy from 'speakeasy';

// Test validation using a sample secret - replace with one from the setup response
const SECRET = 'IVIEGZ3VKJKFC5TQIU5SCZ26EM5W22JK';

// Generate the current TOTP token using the secret (similar to what an authenticator app would do)
const token = speakeasy.totp({
  secret: SECRET,
  encoding: 'base32'
});

console.log(`Generated TOTP token for current time window: ${token}`);

// Generate tokens for adjacent time windows
const currentTime = Math.floor(Date.now() / 1000);
console.log(`Current timestamp: ${currentTime}`);

console.log('\nTokens for nearby time windows:');
for (let i = -2; i <= 2; i++) {
  const nearbyToken = speakeasy.totp({
    secret: SECRET,
    encoding: 'base32',
    time: currentTime + (i * 30) // 30-second windows
  });
  console.log(`Window ${i}: ${nearbyToken}`);
}

// Verify a test token "123456" against our secret (should fail)
const isTestTokenValid = speakeasy.verify({
  secret: SECRET,
  encoding: 'base32',
  token: '123456',
  window: 10  // Using the same window size as our API
});

console.log(`\nTest token "123456" verification: ${isTestTokenValid ? 'VALID' : 'INVALID'}`);

// Verify our generated token against our secret (should pass)
const isRealTokenValid = speakeasy.verify({
  secret: SECRET,
  encoding: 'base32',
  token: token,
  window: 10
});

console.log(`Generated token ${token} verification: ${isRealTokenValid ? 'VALID' : 'INVALID'}`);

// Demonstrate how to verify a token that would be submitted by a user
function verifyUserToken(userToken) {
  const isValid = speakeasy.verify({
    secret: SECRET,
    encoding: 'base32',
    token: userToken,
    window: 10
  });
  
  console.log(`User-submitted token "${userToken}" verification: ${isValid ? 'VALID' : 'INVALID'}`);
  return isValid;
}

// Example usage:
console.log('\nExample validation with manually entered tokens:');
verifyUserToken('123456'); // Should fail
verifyUserToken(token);    // Should pass (this is our generated token)