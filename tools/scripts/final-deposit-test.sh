#!/bin/bash

echo "=== FINAL DEPOSIT TEST WITH PROPER SESSION HANDLING ==="

# Step 1: Login with session handling
echo "1. Testing login with testtelegram user..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"username": "testtelegram", "password": "12345678"}' \
  -c session_cookies.txt \
  -b session_cookies.txt)

echo "Login response: $LOGIN_RESPONSE"

# Check if login was successful
if [[ $LOGIN_RESPONSE == *"\"id\":"* ]]; then
    echo "✅ Login successful!"
    
    # Step 2: Test deposit creation with proper session cookies
    echo ""
    echo "2. Testing deposit creation with authenticated session..."
    
    DEPOSIT_RESPONSE=$(timeout 10 curl -s -X POST http://localhost:5000/api/deposits \
      -H "Content-Type: application/json" \
      -H "Accept: application/json" \
      -d '{"amount": "100", "currency": "EUR"}' \
      -b session_cookies.txt \
      -w "\nHTTP_CODE:%{http_code}" 2>/dev/null || echo "TIMEOUT_OR_ERROR")
    
    echo "Deposit response: $DEPOSIT_RESPONSE"
    
    # Check result
    if [[ $DEPOSIT_RESPONSE == *"HTTP_CODE:200"* ]] || [[ $DEPOSIT_RESPONSE == *"HTTP_CODE:201"* ]]; then
        echo ""
        echo "🎉 SUCCESS: Deposit creation worked!"
        echo "✅ BUG FIXED: Users with referral codes can now create deposits!"
    elif [[ $DEPOSIT_RESPONSE == *"HTTP_CODE:401"* ]]; then
        echo ""
        echo "❌ STILL FAILING: Authentication error persists"
        echo "Issue: Session authentication is not working properly"
    elif [[ $DEPOSIT_RESPONSE == *"TIMEOUT_OR_ERROR"* ]]; then
        echo ""
        echo "⚠️  TIMEOUT: Request is hanging, likely database or middleware issue"
        echo "Issue: Request not completing within 10 seconds"
    else
        echo ""
        echo "⚠️  UNEXPECTED: Got different response: $DEPOSIT_RESPONSE"
    fi
else
    echo "❌ Login failed: $LOGIN_RESPONSE"
fi

echo ""
echo "=== TEST COMPLETED ==="