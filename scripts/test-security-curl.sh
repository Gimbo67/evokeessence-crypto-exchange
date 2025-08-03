#!/bin/bash

# Test script for security dashboard endpoints using curl
BASE_URL="http://localhost:5000"
COOKIE_FILE="admin_cookie.txt"

echo "Testing security API endpoints..."

# Test 1: Security Dashboard endpoint
echo "1. Testing Security Dashboard endpoint..."
curl -s -X GET "${BASE_URL}/api/admin/security/dashboard" -o dashboard_response.json
cat dashboard_response.json
echo ""

# Test 2: Banned IPs endpoint
echo "2. Testing Banned IPs endpoint..."
curl -s -X GET "${BASE_URL}/api/admin/security/banned-ips" -o banned_ips_response.json
cat banned_ips_response.json
echo ""

# Test 3: Security Logs endpoint
echo "3. Testing Security Logs endpoint..."
curl -s -X GET "${BASE_URL}/api/admin/security/logs" -o logs_response.json
cat logs_response.json
echo ""

# Test 4: Security Stats endpoint
echo "4. Testing Security Stats endpoint..."
curl -s -X GET "${BASE_URL}/api/admin/security/stats" -o stats_response.json
cat stats_response.json
echo ""

echo "All tests completed."