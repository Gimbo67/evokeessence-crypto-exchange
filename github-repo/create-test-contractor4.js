/**
 * Script to create a test contractor account for testing the referral system
 */

import bcrypt from 'bcrypt';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';

// Database connection and schema setup
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create a Postgres client for direct connection
const client = postgres(DATABASE_URL, { max: 1, ssl: 'require' });

// Define a simplified schema for our purposes
const users = {
  id: { name: 'id' },
  username: { name: 'username' },
  password: { name: 'password' },
  email: { name: 'email' },
  full_name: { name: 'full_name' },
  address: { name: 'address' },
  country_of_residence: { name: 'country_of_residence' },
  phone_number: { name: 'phone_number' },
  gender: { name: 'gender' },
  is_admin: { name: 'is_admin' },
  is_employee: { name: 'is_employee' },
  is_contractor: { name: 'is_contractor' },
  referral_code: { name: 'referral_code' },
  contractor_commission_rate: { name: 'contractor_commission_rate' },
  status: { name: 'status' },
  kyc_status: { name: 'kyc_status' },
  balance: { name: 'balance' },
  balance_currency: { name: 'balance_currency' },
  created_at: { name: 'created_at' },
  updated_at: { name: 'updated_at' },
};

async function createTestContractor() {
  try {
    // First check if user already exists
    const existingUserResult = await client`
      SELECT id, username, is_contractor, referral_code 
      FROM users 
      WHERE username = 'testcontractor4'
    `;
    
    if (existingUserResult.length > 0) {
      console.log('User testcontractor4 already exists:', existingUserResult[0]);
      await client.end();
      return;
    }
    
    // Generate a hash of the password
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    
    // Create a unique referral code for this contractor
    const referralCode = 'TEST4';
    
    // Insert a new contractor account into the database
    const result = await client`
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
        referral_code, 
        contractor_commission_rate, 
        status, 
        kyc_status, 
        balance, 
        balance_currency, 
        created_at, 
        updated_at
      ) VALUES (
        'testcontractor4', 
        ${hashedPassword}, 
        'testcontractor4@example.com', 
        'Test Contractor Four', 
        '123 Main St', 
        'US', 
        '+1234567890', 
        'other', 
        false, 
        false, 
        true, 
        ${referralCode}, 
        0.85, 
        'active', 
        'approved', 
        50.00, 
        'USD', 
        NOW(), 
        NOW()
      )
      RETURNING id, username, is_contractor, referral_code
    `;
    
    console.log('Test contractor created successfully!');
    console.log('User details:', result[0]);
    
    await client.end();
    return result[0];
  } catch (error) {
    console.error('Error creating test contractor:', error);
    await client.end();
    throw error;
  }
}

// Execute the function
createTestContractor()
  .then(() => {
    console.log('Execution complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to create test contractor:', err);
    process.exit(1);
  });