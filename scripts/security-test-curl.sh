#!/bin/bash

# This script tests security headers from both the dev and prod servers

# Test development server (main application)
echo "========================================="
echo "TESTING DEVELOPMENT SERVER SECURITY HEADERS"
echo "========================================="
curl -I http://0.0.0.0:5000/ 2>/dev/null || echo "Development server not reachable"
echo ""
echo ""

# Test production security server 
echo "========================================="
echo "TESTING PRODUCTION SERVER SECURITY HEADERS"
echo "========================================="

# Kill any existing production test server
pkill -f "test-production-security.js" || true

# Start production security test server in background
NODE_ENV=production SECURITY_TEST=true PORT=5001 node test-production-security.js > security-test.log 2>&1 &
PROD_PID=$!
echo "Production security server starting with PID: $PROD_PID..."
sleep 2

# Test production security headers
curl -I http://0.0.0.0:5001/ 2>/dev/null || echo "Production server not reachable"

# Kill production test server when done
echo "Stopping production test server..."
kill $PROD_PID

echo ""
echo "Security header testing complete"