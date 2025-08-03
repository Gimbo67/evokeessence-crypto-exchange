/**
 * Script to test the complete A64S referral flow:
 * 1. Create a user with referral code A64S
 * 2. Create a deposit for that user
 * 3. Verify the deposit appears in andreavass's contractor dashboard
 */

import { db } from './db/index.js';
import { users, sepaDeposits } from './db/schema.js';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

async function testA64SReferralFlow() {
  console.log("Starting test of A64S referral flow");
  
  try {
    // Step 1: Find andreavass user
    const andreavass = await db.query.users.findFirst({
      where: eq(users.username, "andreavass")
    });
    
    if (!andreavass) {
      console.error("Error: Could not find andreavass contractor in database");
      return;
    }
    
    console.log(`Found andreavass contractor with ID: ${andreavass.id}`);
    
    // Step 2: Create a unique test user
    const uniqueSuffix = crypto.randomBytes(4).toString('hex');
    const testUsername = `testA64S_${uniqueSuffix}`;
    
    // Delete the test user if it exists (for repeat testing)
    await db.delete(users).where(eq(users.username, testUsername));
    
    // Create the test user with referral_code A64S
    const [testUser] = await db
      .insert(users)
      .values({
        username: testUsername,
        password: '$2b$10$6KqEO0aR9LY5H0afp1vq7OH3dvrSdvB9aDEjRfbvLRE8vrFuv0y2a', // hash for Test12345!
        email: `${testUsername}@example.com`,
        full_name: `Test A64S User ${uniqueSuffix}`,
        referred_by: 'A64S', // This is the important part
        contractor_id: andreavass.id, // Directly set the contractor_id too
        email_verified: true,
        kyc_status: 'not_started',
        status: 'active',
        balance: 0,
        balance_currency: 'USD'
      })
      .returning();
    
    console.log(`Created test user: ${testUser.username} (ID: ${testUser.id})`);
    
    // Step 3: Create a deposit for this user
    const amount = 100;
    const currency = 'EUR';
    const commissionFee = 5;
    const contractorCommission = (amount * 0.85 / 100).toFixed(2); // 0.85%
    
    // Generate a random reference number
    const reference = `REF${Math.floor(Math.random() * 1000000)}`;
    
    const [deposit] = await db
      .insert(sepaDeposits)
      .values({
        userId: testUser.id,
        amount: amount.toString(),
        currency,
        reference,
        commissionFee: commissionFee.toString(),
        status: 'completed',
        referralCode: 'A64S',
        contractorId: andreavass.id,
        contractorCommission,
        createdAt: new Date(),
        completedAt: new Date()
      })
      .returning();
    
    console.log(`Created deposit for ${testUser.username}:`);
    console.log(`- Amount: ${deposit.amount} ${deposit.currency}`);
    console.log(`- Reference: ${deposit.reference}`);
    console.log(`- Status: ${deposit.status}`);
    console.log(`- Contractor ID: ${deposit.contractorId}`);
    console.log(`- Contractor Commission: ${deposit.contractorCommission}`);
    
    // Step 4: Verify that the deposit appears in andreavass's list
    const contractorDeposits = await db.query.sepaDeposits.findMany({
      where: eq(sepaDeposits.contractorId, andreavass.id)
    });
    
    console.log(`\nFound ${contractorDeposits.length} total deposits assigned to andreavass contractor:`);
    
    let ourDepositFound = false;
    for (const d of contractorDeposits) {
      if (d.id === deposit.id) {
        ourDepositFound = true;
        console.log(`✅ Our test deposit (ID: ${d.id}) was correctly linked to andreavass`);
      } else {
        console.log(`- Deposit ID: ${d.id}, Amount: ${d.amount} ${d.currency}, User ID: ${d.userId}`);
      }
    }
    
    if (!ourDepositFound) {
      console.error(`❌ ERROR: Our test deposit (ID: ${deposit.id}) was NOT found in andreavass's deposits!`);
    }
    
    console.log("\nVerification test completed");
    
  } catch (error) {
    console.error("Error in test flow:", error);
  }
}

// Run the test
testA64SReferralFlow().then(() => {
  console.log("Script completed");
  process.exit(0);
}).catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
});