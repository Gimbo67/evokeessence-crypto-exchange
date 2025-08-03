#!/bin/bash

# Start the production security test server
echo "Starting production security test server..."
NODE_ENV=production SECURITY_TEST=true node test-production-security.js