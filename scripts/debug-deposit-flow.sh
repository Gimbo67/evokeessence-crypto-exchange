#!/bin/bash

echo "=== DEBUGGING DEPOSIT FLOW ==="

# Step 1: Test login works
echo "1. Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testtelegram", "password": "12345678"}' \
  -c cookies.txt)

echo "Login successful: $LOGIN_RESPONSE"

# Step 2: Test authentication status
echo ""
echo "2. Checking authentication status..."
AUTH_STATUS=$(curl -s -X GET http://localhost:5000/api/auth/status \
  -b cookies.txt)

echo "Auth status: $AUTH_STATUS"

# Step 3: Test deposit endpoint with timeout
echo ""
echo "3. Testing deposit creation (with 10s timeout)..."
timeout 10 curl -s -X POST http://localhost:5000/api/deposits \
  -H "Content-Type: application/json" \
  -d '{"amount": "100", "currency": "EUR"}' \
  -b cookies.txt \
  -w "HTTP_CODE:%{http_code}" || echo "TIMEOUT or ERROR occurred"

echo ""
echo "=== TEST COMPLETED ==="