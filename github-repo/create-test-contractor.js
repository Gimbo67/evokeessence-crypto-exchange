/**
 * Script to create a test contractor account
 */
import { db } from './server/db/index.js';
import { users } from './db/schema.js';
import bcrypt from 'bcrypt';

async function createTestContractor() {
  try {
    console.log('Creating test contractor user...');
    
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'testcontractor')
    });
    
    if (existingUser) {
      console.log('Test contractor already exists, updating...');
      
      // Update the existing user to be a contractor
      await db.update(users)
        .set({
          is_contractor: true,
          referral_code: 'TEST1',
          contractor_commission_rate: 0.85,
          password: await bcrypt.hash('Testpass123', 10)
        })
        .where((users, { eq }) => eq(users.username, 'testcontractor'));
      
      console.log('Updated existing user as contractor');
      return;
    }
    
    // Create a completely new contractor user
    const password = await bcrypt.hash('Testpass123', 10);
    
    const newUser = {
      username: 'testcontractor',
      email: 'testcontractor@evo-exchange.com',
      password: password,
      full_name: 'Test Contractor',
      is_admin: false,
      is_employee: false,
      is_contractor: true,
      referral_code: 'TEST1',
      contractor_commission_rate: 0.85,
      kyc_status: 'verified',
      balance: '1000',
      balance_currency: 'USD',
      created_at: new Date(),
      status: 'active'
    };
    
    const [result] = await db.insert(users).values(newUser).returning();
    
    console.log('Created test contractor successfully:', {
      id: result.id,
      username: result.username,
      is_contractor: result.is_contractor,
      referral_code: result.referral_code
    });
  } catch (error) {
    console.error('Error creating test contractor:', error);
  }
}

// Execute the function
createTestContractor();