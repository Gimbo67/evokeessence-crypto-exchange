/**
 * Script to create a test contractor account for testing the referral system
 */

import bcrypt from 'bcrypt';
import { db } from './db/index.js';
import { users } from './db/schema.js';
import { eq } from 'drizzle-orm';

async function createTestContractor() {
  try {
    // Generate a hash of the password
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    
    // Create a unique referral code for this contractor
    const referralCode = 'TEST3';
    
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, 'testcontractor3')
    });
    
    if (existingUser) {
      console.log('User testcontractor3 already exists.');
      console.log('User ID:', existingUser.id);
      console.log('Contractor Status:', existingUser.is_contractor);
      console.log('Referral Code:', existingUser.referral_code);
      return existingUser;
    }
    
    // Insert a new contractor account into the database
    const insertedUsers = await db.insert(users).values({
      username: 'testcontractor3',
      password: hashedPassword,
      email: 'testcontractor3@example.com',
      full_name: 'Test Contractor Three',
      address: '123 Main St',
      country_of_residence: 'US',
      phone_number: '+1234567890',
      gender: 'other',
      is_admin: false,
      is_employee: false,
      is_contractor: true, // Set as contractor
      referral_code: referralCode, // Set referral code
      contractor_commission_rate: 0.85, // 0.85% commission rate
      status: 'active',
      kyc_status: 'approved',
      balance: 50.00,
      balance_currency: 'USD',
      created_at: new Date(),
      updated_at: new Date()
    }).returning();
    
    console.log('Test contractor created successfully!');
    console.log('User details:', insertedUsers[0]);
    
    return insertedUsers[0];
  } catch (error) {
    console.error('Error creating test contractor:', error);
    throw error;
  }
}

// Execute the function
createTestContractor()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Failed to create test contractor:', err);
    process.exit(1);
  });