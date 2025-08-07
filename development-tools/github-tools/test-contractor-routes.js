/**
 * Test script to check contractor status and API routes
 */

import postgres from 'postgres';
import bcrypt from 'bcrypt';

// Database connection
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create a Postgres client for direct connection
const client = postgres(DATABASE_URL, { max: 1, ssl: 'require' });

async function testContractorRoutes() {
  try {
    // 1. Check if our test contractor exists and has proper fields
    console.log('Checking if test contractor exists...');
    const userResult = await client`
      SELECT 
        id, 
        username, 
        is_contractor, 
        referral_code, 
        contractor_commission_rate,
        is_admin,
        is_employee
      FROM users 
      WHERE username = 'testcontractor4'
    `;
    
    if (userResult.length === 0) {
      console.error('Test contractor not found!');
      return;
    }
    
    const contractor = userResult[0];
    console.log('Found contractor:', contractor);
    
    // 2. Check if we have the contractor_dashboard route defined in the application
    // Since we can't easily check routes from a script, we'll print a reminder
    console.log('\nVerify these routes in the application:');
    console.log('- /contractor/dashboard - Contractor analytics dashboard');
    console.log('- /api/contractor/analytics - API route for fetching contractor analytics data');
    console.log('- /api/contractor/referrals - API route for fetching contractor referral data');
    
    // 3. Let's check if any deposits are tracked with this contractor's referral code
    console.log('\nChecking for deposits with referral code:', contractor.referral_code);
    const depositsResult = await client`
      SELECT 
        id, 
        user_id as "userId", 
        amount, 
        currency, 
        status, 
        commission_fee as "commissionFee", 
        referral_code as "referralCode", 
        contractor_id as "contractorId", 
        contractor_commission as "contractorCommission"
      FROM sepa_deposits 
      WHERE referral_code = ${contractor.referral_code}
    `;
    
    console.log(`Found ${depositsResult.length} deposits with this referral code`);
    if (depositsResult.length > 0) {
      console.log('Deposits:', depositsResult);
    }
    
    // 4. Let's check if any users have been referred by this contractor
    console.log('\nChecking for users referred by:', contractor.referral_code);
    const referredUsersResult = await client`
      SELECT 
        id, 
        username, 
        email, 
        full_name, 
        referred_by 
      FROM users 
      WHERE referred_by = ${contractor.referral_code}
    `;
    
    console.log(`Found ${referredUsersResult.length} users referred by this contractor`);
    if (referredUsersResult.length > 0) {
      console.log('Referred users:', referredUsersResult);
    }
    
    // 5. If no referred users, let's create a test user with the referral code
    if (referredUsersResult.length === 0) {
      console.log('\nCreating a test referred user with this referral code...');
      // Use bcrypt to hash password instead of PostgreSQL's crypt function
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('TestReferredUser123!', salt);
      
      const randomUsername = 'referred_user_' + Math.floor(Math.random() * 10000);
      const randomEmail = 'referred' + Math.floor(Math.random() * 10000) + '@example.com';
      
      const newUserResult = await client`
        INSERT INTO users (
          username,
          password,
          email,
          full_name,
          address,
          country_of_residence,
          phone_number,
          gender,
          is_admin,
          is_employee,
          is_contractor,
          referred_by,
          status,
          kyc_status,
          balance,
          balance_currency,
          created_at,
          updated_at
        ) VALUES (
          ${randomUsername},
          ${hashedPassword},
          ${randomEmail},
          'Referred Test User',
          '123 Main St',
          'US',
          '+1234567890',
          'other',
          false,
          false,
          false,
          ${contractor.referral_code},
          'active',
          'approved',
          0.00,
          'USD',
          NOW(),
          NOW()
        )
        RETURNING id, username, referred_by
      `;
      
      console.log('Created referred user:', newUserResult[0]);
      
      // 6. Create a test deposit for this referred user
      console.log('\nCreating a test deposit for this referred user...');
      const depositAmount = 1000.00;
      const commissionFee = depositAmount * 0.10; // 10% platform commission
      const contractorCommission = depositAmount * 0.0085; // 0.85% contractor commission
      
      const newDepositResult = await client`
        INSERT INTO sepa_deposits (
          user_id,
          amount,
          currency,
          reference,
          status,
          commission_fee,
          referral_code,
          contractor_id,
          contractor_commission,
          created_at,
          completed_at
        ) VALUES (
          ${newUserResult[0].id},
          ${depositAmount},
          'EUR',
          ${'REF-' + Math.floor(Math.random() * 1000000)},
          'completed',
          ${commissionFee},
          ${contractor.referral_code},
          ${contractor.id},
          ${contractorCommission},
          NOW(),
          NOW()
        )
        RETURNING id, user_id, amount, contractor_commission
      `;
      
      console.log('Created deposit:', newDepositResult[0]);
    }
    
  } catch (error) {
    console.error('Error in test script:', error);
  } finally {
    await client.end();
  }
}

// Run the test
testContractorRoutes()
  .then(() => {
    console.log('Test completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });