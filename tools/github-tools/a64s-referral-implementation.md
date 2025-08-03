# A64S Referral Code Implementation Documentation

## Overview

This document outlines the implementation details for the special referral code "A64S" which automatically assigns users to the contractor "andreavass". All deposits made by users who registered with this referral code are tracked and properly assigned to the andreavass contractor account.

## Database Schema Changes

1. Added a `contractor_id` column to the `users` table to maintain a permanent relationship between users and the contractor who referred them.
2. Modified unique constraint on `referral_code` in the `users` table to allow empty strings and null values.

## Implementation Details

### User Registration Flow

When a user registers with referral code "A64S", the system:
1. Identifies this as a special case in both `auth.routes.ts` and `vite-bypass.ts` 
2. Finds the `andreavass` contractor account
3. Sets the `contractor_id` field for the new user to andreavass's ID
4. This creates a permanent link between the user and andreavass

The implementation handles both regular user registration and bypass registration (used for testing and mobile app integration) to ensure consistent behavior across all registration flows.

### Deposit Creation Flow

When a user creates a deposit:
1. The system checks if the user has a `contractor_id` set
2. If they do, it retrieves the contractor details and includes them in the deposit record
3. The `contractorId` field in the deposit record is set to andreavass's ID
4. The contractor commission is calculated based on andreavass's commission rate

## Migration Scripts

1. `add-contractor-id.js` - Adds the `contractor_id` column to the users table
2. `update-a64s-users.js` - Updates existing users with referral code "A64S" to link them to andreavass
3. `verify-a64s-test.js` - Verifies that users with code "A64S" are properly linked to andreavass

## Testing

The `test-a64s-deposit-flow.js` script demonstrates the complete flow:
1. Creates a user with referral code "A64S"
2. Sets their `contractor_id` to andreavass's ID
3. Creates a deposit for that user
4. Verifies that the deposit appears in andreavass's deposit list

Additionally, the `test-a64s-deposit-direct.cjs` script tests the implementation with existing users:
1. Verifies that user "test668" is correctly associated with referral code "A64S" and contractor "andreavass"
2. Creates a new deposit for this user
3. Confirms that the deposit is properly tracked in andreavass's contractor dashboard

## Implementation Files

The following files were modified to implement this feature:

1. `db/schema.ts` - Added `contractor_id` field to users table
2. `server/routes/auth.routes.ts` - Added special handling for "A64S" referral code during registration
3. `server/routes/deposit.routes.ts` - Modified deposit creation to use `contractor_id` for assigning deposits
4. `server/vite-bypass.ts` - Added special handling for "A64S" referral code in the bypass registration route

## Verification

The implementation has been verified to ensure:
1. New users who register with code "A64S" are properly linked to andreavass
2. Existing users who registered with "A64S" have been updated to link to andreavass
3. All deposits from users with "A64S" referral code are tracked in andreavass's dashboard
4. Both standard and bypass registration routes properly handle the A64S code