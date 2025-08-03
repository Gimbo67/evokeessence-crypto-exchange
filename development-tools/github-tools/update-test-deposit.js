/**
 * Script to update the test deposit with the correct referral code
 */

import postgres from 'postgres';

// Database connection
const DATABASE_URL = process.env.DATABASE_URL;
const client = postgres(DATABASE_URL, { max: 1, ssl: 'require' });

// Constants for testing
const TEST_USER = 'test000';
const TEST_REFERRAL_CODE = 'A64S';

async function updateTestDeposit() {
  try {
    console.log('Updating test deposit with the correct referral code...');
    
    // 1. Get the test user's ID
    console.log(`\nGetting user ID for ${TEST_USER}...`);
    const userResult = await client`
      SELECT id, username
      FROM users
      WHERE username = ${TEST_USER}
    `;
    
    if (userResult.length === 0) {
      console.error(`Test user ${TEST_USER} not found.`);
      return;
    }
    
    const testUserId = userResult[0].id;
    console.log(`Found test user with ID: ${testUserId}`);
    
    // 2. Get the contractor ID for the referral code
    console.log(`\nGetting contractor ID for referral code ${TEST_REFERRAL_CODE}...`);
    const contractorResult = await client`
      SELECT id, username
      FROM users
      WHERE referral_code = ${TEST_REFERRAL_CODE}
    `;
    
    if (contractorResult.length === 0) {
      console.error(`No contractor found with referral code ${TEST_REFERRAL_CODE}.`);
      return;
    }
    
    const contractorId = contractorResult[0].id;
    console.log(`Found contractor with ID: ${contractorId}`);
    
    // 3. Get the deposit from the test user
    console.log(`\nGetting deposit for user ID ${testUserId}...`);
    const depositResult = await client`
      SELECT id, user_id, amount, currency, status, referral_code, contractor_id
      FROM sepa_deposits
      WHERE user_id = ${testUserId}
    `;
    
    if (depositResult.length === 0) {
      console.error(`No deposits found for user ID ${testUserId}.`);
      return;
    }
    
    const deposit = depositResult[0];
    console.log(`Found deposit with ID: ${deposit.id}, Amount: ${deposit.amount} ${deposit.currency}, Status: ${deposit.status}`);
    
    // 4. Update the deposit with the referral code and contractor ID
    console.log(`\nUpdating deposit ID ${deposit.id} with referral code ${TEST_REFERRAL_CODE} and contractor ID ${contractorId}...`);
    const updateResult = await client`
      UPDATE sepa_deposits
      SET referral_code = ${TEST_REFERRAL_CODE}, contractor_id = ${contractorId}
      WHERE id = ${deposit.id}
      RETURNING id, user_id, amount, currency, status, referral_code, contractor_id
    `;
    
    if (updateResult.length === 0) {
      console.error(`Failed to update deposit ID ${deposit.id}.`);
      return;
    }
    
    const updatedDeposit = updateResult[0];
    console.log(`\nDeposit successfully updated!`);
    console.log(`- Deposit ID: ${updatedDeposit.id}`);
    console.log(`- User ID: ${updatedDeposit.user_id}`);
    console.log(`- Amount: ${updatedDeposit.amount} ${updatedDeposit.currency}`);
    console.log(`- Status: ${updatedDeposit.status}`);
    console.log(`- Referral Code: ${updatedDeposit.referral_code}`);
    console.log(`- Contractor ID: ${updatedDeposit.contractor_id}`);
    
    console.log('\nUpdate process completed successfully!');
  } catch (error) {
    console.error('Error updating deposit:', error);
  } finally {
    await client.end();
  }
}

updateTestDeposit();