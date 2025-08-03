/**
 * Script to verify the A64S code assignment to andreavass contractor
 * This version uses ESM imports with TypeScript
 */

import { db } from './db/index.js';
import { users, sepaDeposits } from './db/schema.js';
import { eq } from 'drizzle-orm';

async function verifyA64SReferrals() {
  console.log("Starting verification of A64S code assignment to andreavass contractor");

  try {
    // Find our recently registered test user
    const testUser = await db.query.users.findFirst({
      where: eq(users.username, "testA64S")
    });

    if (!testUser) {
      console.log("Test user 'testA64S' not found");
      return;
    }

    console.log("Test user found:", {
      id: testUser.id,
      username: testUser.username,
      referredBy: testUser.referred_by,
      contractorId: testUser.contractor_id
    });

    // Find the contractor andreavass
    const andreavass = await db.query.users.findFirst({
      where: eq(users.username, "andreavass")
    });

    if (!andreavass) {
      console.log("Contractor 'andreavass' not found");
      return;
    }

    console.log("Contractor found:", {
      id: andreavass.id,
      username: andreavass.username,
      isContractor: andreavass.is_contractor,
      referralCode: andreavass.referral_code
    });

    // Check if the test user is correctly linked
    if (testUser.contractor_id === andreavass.id) {
      console.log("✅ Test user is correctly linked to andreavass contractor");
    } else {
      console.log("❌ Test user is NOT linked to andreavass contractor");
    }

    // Show all users with A64S referral code
    const a64sUsers = await db.query.users.findMany({
      where: eq(users.referred_by, "A64S")
    });

    console.log(`Found ${a64sUsers.length} users with referral code A64S`);
    for (const user of a64sUsers) {
      console.log(`- User ${user.username} (ID: ${user.id}, contractor_id: ${user.contractor_id || 'null'})`);
    }

  } catch (error) {
    console.error("Error during verification:", error);
  }
}

// Run verification
verifyA64SReferrals().then(() => {
  console.log("Verification completed");
  process.exit(0);
}).catch(error => {
  console.error("Verification failed:", error);
  process.exit(1);
});