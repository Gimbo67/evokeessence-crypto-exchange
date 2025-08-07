import speakeasy from 'speakeasy';

// The secret key we received from the setup request
const secret = 'EVYXQVCGMFECQ6S6GAYGIUKYFBTSIMK6';

// Generate a token using the secret key
const token = speakeasy.totp({
  secret: secret,
  encoding: 'base32'
});

console.log('Generated token:', token);