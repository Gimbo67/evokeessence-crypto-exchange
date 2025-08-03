#!/bin/bash

echo "=== TESTING AUTHENTICATION FLOW WITH ENHANCED LOGGING ==="

# Login first and save cookies
echo "1. Logging in with testtelegram user..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testtelegram", "password": "12345678"}' \
  -c cookies.txt)

echo "Login response: $LOGIN_RESPONSE"

# Wait a moment for session to be established
sleep 1

# Test deposit creation with saved cookies
echo ""
echo "2. Testing deposit creation with session cookies..."
DEPOSIT_RESPONSE=$(curl -s -X POST http://localhost:5000/api/deposits \
  -H "Content-Type: application/json" \
  -d '{"amount": "100", "currency": "EUR"}' \
  -b cookies.txt \
  -w "HTTP_CODE:%{http_code}")

echo "Deposit response: $DEPOSIT_RESPONSE"

# Check if successful
if [[ $DEPOSIT_RESPONSE == *"HTTP_CODE:200"* ]]; then
    echo ""
    echo "✅ SUCCESS: Deposit creation worked!"
elif [[ $DEPOSIT_RESPONSE == *"HTTP_CODE:401"* ]]; then
    echo ""
    echo "❌ FAILED: Still getting 401 authentication error"
    echo "Check server logs for detailed authentication information"
else
    echo ""
    echo "⚠️  UNEXPECTED: Got different response code"
fi

echo ""
echo "=== TEST COMPLETED ==="