#!/bin/bash

# Test script to verify proper handling of boolean values from PostgreSQL
# This script logs in as an admin user and verifies that the isAdmin and isEmployee properties
# are correctly converted from PostgreSQL 't'/'f' values to JavaScript booleans

# Set the server URL
SERVER_URL="http://localhost:5001"

echo "Starting login test..."

# Create a temporary cookie file to maintain session
COOKIE_FILE=$(mktemp)

# Attempt login as admin
echo "Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -c $COOKIE_FILE -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"username":"admin","password":"Adm1nqdU2017"}' \
  "$SERVER_URL/bypass/auth/login")

echo "Login response:"
echo $LOGIN_RESPONSE | jq .

# Check the boolean values in the login response
echo -e "\nBoolean value verification from login response:"
IS_ADMIN=$(echo $LOGIN_RESPONSE | jq '.isAdmin')
IS_EMPLOYEE=$(echo $LOGIN_RESPONSE | jq '.isEmployee')

echo "- isAdmin: $IS_ADMIN"
echo "- isEmployee: $IS_EMPLOYEE"

# Fetch the user data to further verify boolean conversion
echo -e "\nFetching user data..."
USER_RESPONSE=$(curl -s -b $COOKIE_FILE \
  -H "Accept: application/json" \
  "$SERVER_URL/bypass/user")

echo "User data response:"
echo $USER_RESPONSE | jq .

# Check the boolean values in the user data
echo -e "\nBoolean value verification from user data:"
IS_ADMIN=$(echo $USER_RESPONSE | jq '.isAdmin')
IS_EMPLOYEE=$(echo $USER_RESPONSE | jq '.isEmployee')
TWO_FACTOR_ENABLED=$(echo $USER_RESPONSE | jq '.twoFactorEnabled')

echo "- isAdmin: $IS_ADMIN"
echo "- isEmployee: $IS_EMPLOYEE"
echo "- twoFactorEnabled: $TWO_FACTOR_ENABLED"

# Clean up temporary cookie file
rm $COOKIE_FILE

echo -e "\nTest completed!"
