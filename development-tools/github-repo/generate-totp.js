import crypto from 'crypto';

// Get user's secret from earlier command
const secret = 'FBIEKLD3KJDSQMLGIQ5G22Z4M5FTGYSR';

// Convert base32 secret to buffer
function base32ToBuffer(base32) {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  
  for (let i = 0; i < base32.length; i++) {
    const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
    if (val === -1) continue; // Skip non-base32 chars
    bits += val.toString(2).padStart(5, '0');
  }
  
  // Convert bits to bytes
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substr(i, 8), 2));
  }
  
  return Buffer.from(bytes);
}

// Generate TOTP using HMAC-SHA1
function generateTOTP(secret, window = 0) {
  // Convert base32 secret to buffer
  const secretBuffer = base32ToBuffer(secret);
  
  // Get current 30-second counter
  const counter = Math.floor(Date.now() / 30000) + window;
  
  // Convert counter to buffer
  const counterBuffer = Buffer.alloc(8);
  let counterValue = counter;
  for (let i = 0; i < 8; i++) {
    counterBuffer[7 - i] = counterValue & 0xff;
    counterValue >>= 8;
  }
  
  // Calculate HMAC-SHA1
  const hmac = crypto.createHmac('sha1', secretBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();
  
  // Get offset and truncate
  const offset = digest[digest.length - 1] & 0xf;
  const binary = ((digest[offset] & 0x7f) << 24) |
                ((digest[offset + 1] & 0xff) << 16) |
                ((digest[offset + 2] & 0xff) << 8) |
                (digest[offset + 3] & 0xff);
  
  // Get 6-digit code
  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

// Generate current TOTP
const currentToken = generateTOTP(secret);
console.log(`Current token: ${currentToken}`);

// Also generate tokens for previous and next window (for testing)
const prevToken = generateTOTP(secret, -1);
const nextToken = generateTOTP(secret, 1);
console.log(`Previous window token: ${prevToken}`);
console.log(`Next window token: ${nextToken}`);