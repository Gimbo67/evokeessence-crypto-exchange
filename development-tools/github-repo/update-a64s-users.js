/**
 * Script to update users registered with referral code A64S
 * This ensures all existing users with this code are properly linked to andreavass
 */

import { db } from './db/index.js';
import { users, sepaDeposits } from './db/schema.js';
import { eq } from 'drizzle-orm';

async function updateA64SUsers() {
  console.log("Starting update for users with referral code A64S");
  
  try {
    // First, find andreavass user in the database
    const andreavass = await db.query.users.findFirst({
      where: eq(users.username, "andreavass")
    });
    
    if (!andreavass) {
      console.error("Error: Could not find contractor 'andreavass' in the database");
      return;
    }
    
    console.log(`Found andreavass with ID: ${andreavass.id}`);
    
    // Find all users who registered with the A64S referral code
    const a64sUsers = await db.query.users.findMany({
      where: eq(users.referred_by, "A64S")
    });
    
    console.log(`Found ${a64sUsers.length} users registered with code A64S`);
    
    // Update each user to have andreavass as their contractor_id
    const updatedUsers = [];
    for (const user of a64sUsers) {
      console.log(`Updating user ${user.username} (ID: ${user.id}) to link with andreavass`);
      
      // Skip update if the user already has the correct contractor_id
      if (user.contractor_id === andreavass.id) {
        console.log(`User ${user.username} already has contractor_id set to andreavass (${andreavass.id})`);
        continue;
      }
      
      // Update the user's contractor_id
      const [updatedUser] = await db
        .update(users)
        .set({ contractor_id: andreavass.id })
        .where(eq(users.id, user.id))
        .returning();
      
      updatedUsers.push(updatedUser);
      console.log(`Updated user ${updatedUser.username} (ID: ${updatedUser.id})`);
    }
    
    console.log(`Successfully updated ${updatedUsers.length} users`);
    
    // Now update all deposits from these users to ensure they're linked to andreavass
    let totalDeposits = 0;
    let updatedDeposits = 0;
    
    for (const user of a64sUsers) {
      // Find all deposits from this user
      const userDeposits = await db.query.sepaDeposits.findMany({
        where: eq(sepaDeposits.userId, user.id)
      });
      
      totalDeposits += userDeposits.length;
      console.log(`User ${user.username} has ${userDeposits.length} deposits`);
      
      // Update deposits that don't have contractorId set to andreavass
      for (const deposit of userDeposits) {
        if (deposit.contractorId !== andreavass.id) {
          // Calculate contractor commission rate (if needed)
          let contractorCommission = deposit.contractorCommission;
          
          // If no commission is set but we have an amount, calculate it
          if (!contractorCommission && deposit.amount) {
            const amount = parseFloat(deposit.amount);
            const contractorRate = parseFloat(andreavass.contractor_commission_rate || 0.85) / 100;
            contractorCommission = (amount * contractorRate).toFixed(2);
            console.log(`Calculated commission for deposit ${deposit.id}: ${contractorCommission}`);
          }
          
          // Update the deposit
          const [updatedDeposit] = await db
            .update(sepaDeposits)
            .set({ 
              contractorId: andreavass.id,
              referralCode: "A64S",
              contractorCommission: contractorCommission?.toString()
            })
            .where(eq(sepaDeposits.id, deposit.id))
            .returning();
          
          updatedDeposits++;
          console.log(`Updated deposit ${updatedDeposit.id} to link with andreavass`);
        }
      }
    }
    
    console.log(`Successfully updated ${updatedDeposits} deposits out of ${totalDeposits} total`);
    console.log("Update process completed successfully");
    
  } catch (error) {
    console.error("Error updating A64S users:", error);
  }
}

// Run the update function
updateA64SUsers().then(() => {
  console.log("Script completed");
  process.exit(0);
}).catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
});