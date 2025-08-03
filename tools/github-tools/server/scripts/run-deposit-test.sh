#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}   Testing End-to-End Deposit Flow   ${NC}"
echo -e "${YELLOW}============================================${NC}"

echo -e "${GREEN}This script will test the end-to-end deposit flow:${NC}"
echo "1. Create a test deposit of 1000 EUR"
echo "2. Apply 16% commission"
echo "3. Update deposit status to 'successful'"
echo "4. Verify balance update is correct"
echo "5. Verify exchange rate consistency"
echo ""
echo -e "${YELLOW}Note: This will create real database entries${NC}"
echo ""

# Give user a chance to abort
read -p "Press Enter to continue or Ctrl+C to abort..."

echo "Running test script..."
echo ""

# Run the test using tsx (for TypeScript execution)
npx tsx server/scripts/test-deposit-flow.ts

# Check if script executed successfully
if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}Test completed successfully!${NC}"
  echo ""
  echo "Now you can verify the results in the UI by:"
  echo "1. Logging in as the test user"
  echo "2. Checking the balance and transaction history"
  echo "3. Logging in as admin and viewing the client's details"
  echo "4. Confirming that exchange rates are consistent across views"
else
  echo ""
  echo -e "${RED}Test failed. Please check the logs above for details.${NC}"
fi

echo -e "${YELLOW}============================================${NC}"
