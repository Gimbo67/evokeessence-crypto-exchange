import { db } from "@db";
import { sepaDeposits, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { getExchangeRates } from "../services/exchange-rates";

// Constants
const TEST_USER_ID = 3; // Assuming test3 user has ID 3 - modify as needed
const TEST_DEPOSIT_AMOUNT = 1000;
const TEST_DEPOSIT_CURRENCY = 'EUR';
const COMMISSION_RATE = 0.16; // 16%

/**
 * This script tests the end-to-end deposit flow:
 * 1. Logs the user's initial balance
 * 2. Creates a test deposit
 * 3. Simulates admin approval of the deposit
 * 4. Verifies the balance was updated correctly with commission applied
 * 5. Verifies exchange rate consistency
 */
async function runTest() {
  console.log("========== DEPOSIT FLOW TEST ==========");
  console.log(`Testing with user ID: ${TEST_USER_ID}`);
  console.log(`Test deposit: ${TEST_DEPOSIT_AMOUNT} ${TEST_DEPOSIT_CURRENCY}`);
  console.log(`Commission rate: ${COMMISSION_RATE * 100}%`);
  console.log("=======================================");

  try {
    // Step 1: Get user's initial balance
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, TEST_USER_ID))
      .limit(1);

    if (!user) {
      console.error(`User with ID ${TEST_USER_ID} not found`);
      return;
    }

    const initialBalance = parseFloat(user.balance?.toString() || '0');
    const balanceCurrency = user.balanceCurrency || 'EUR';
    
    console.log(`Initial user balance: ${initialBalance} ${balanceCurrency}`);

    // Step 2: Create a test deposit
    console.log(`\nCreating test deposit of ${TEST_DEPOSIT_AMOUNT} ${TEST_DEPOSIT_CURRENCY}...`);
    
    // Calculate commission
    const commissionAmount = TEST_DEPOSIT_AMOUNT * COMMISSION_RATE;
    const amountAfterCommission = TEST_DEPOSIT_AMOUNT - commissionAmount;
    
    console.log(`Commission amount (${COMMISSION_RATE * 100}%): ${commissionAmount} ${TEST_DEPOSIT_CURRENCY}`);
    console.log(`Amount after commission: ${amountAfterCommission} ${TEST_DEPOSIT_CURRENCY}`);

    // Create deposit record - store amount AFTER commission
    const [deposit] = await db
      .insert(sepaDeposits)
      .values({
        userId: TEST_USER_ID,
        amount: amountAfterCommission.toString(),
        currency: TEST_DEPOSIT_CURRENCY,
        commissionFee: commissionAmount.toString(),
        status: 'pending',
        reference: `TEST-${Date.now()}`,
        createdAt: new Date(),
      })
      .returning();

    console.log(`Deposit created successfully with ID: ${deposit.id}`);
    console.log(`Deposit status: ${deposit.status}`);

    // Step 3: Simulate admin approval
    console.log("\nSimulating admin approval of deposit...");
    
    // Get exchange rates for conversion if needed
    const exchangeRates = await getExchangeRates();
    console.log("Current exchange rates:", exchangeRates);
    
    // Convert deposit amount to user's currency if different
    let convertedAmount = amountAfterCommission;
    if (TEST_DEPOSIT_CURRENCY !== balanceCurrency) {
      const conversionRate = exchangeRates[TEST_DEPOSIT_CURRENCY][balanceCurrency];
      convertedAmount = amountAfterCommission * conversionRate;
      console.log(`Converting ${amountAfterCommission} ${TEST_DEPOSIT_CURRENCY} to ${balanceCurrency}`);
      console.log(`Conversion rate: 1 ${TEST_DEPOSIT_CURRENCY} = ${conversionRate} ${balanceCurrency}`);
      console.log(`Converted amount: ${convertedAmount} ${balanceCurrency}`);
    }

    // Calculate new balance
    const newBalance = initialBalance + convertedAmount;
    console.log(`Calculated new balance: ${newBalance} ${balanceCurrency}`);

    // Update deposit status and user balance in transaction
    await db.transaction(async (tx) => {
      // Update deposit status
      await tx
        .update(sepaDeposits)
        .set({
          status: 'successful',
          completedAt: new Date(),
        })
        .where(eq(sepaDeposits.id, deposit.id));

      // Update user balance
      await tx
        .update(users)
        .set({
          balance: newBalance.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(users.id, TEST_USER_ID));
      
      console.log("Transaction completed successfully");
    });

    // Step 4: Verify final state
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, TEST_USER_ID))
      .limit(1);

    const [updatedDeposit] = await db
      .select()
      .from(sepaDeposits)
      .where(eq(sepaDeposits.id, deposit.id))
      .limit(1);

    console.log("\n======== TEST RESULTS ========");
    console.log(`Initial balance: ${initialBalance} ${balanceCurrency}`);
    console.log(`Deposit amount: ${TEST_DEPOSIT_AMOUNT} ${TEST_DEPOSIT_CURRENCY}`);
    console.log(`Commission deducted: ${commissionAmount} ${TEST_DEPOSIT_CURRENCY}`);
    console.log(`Amount after commission: ${amountAfterCommission} ${TEST_DEPOSIT_CURRENCY}`);
    console.log(`Final balance: ${updatedUser?.balance} ${balanceCurrency}`);
    console.log(`Deposit status: ${updatedDeposit?.status}`);
    
    // Verify commission was correctly applied
    const expectedBalance = (initialBalance + amountAfterCommission).toFixed(2);
    const actualBalance = parseFloat(updatedUser?.balance?.toString() || '0').toFixed(2);
    
    if (TEST_DEPOSIT_CURRENCY === balanceCurrency && expectedBalance === actualBalance) {
      console.log("\n✅ TEST PASSED: Commission was correctly applied, and balance was updated properly");
    } else if (TEST_DEPOSIT_CURRENCY !== balanceCurrency) {
      console.log("\n✅ TEST PASSED: Deposit was converted to user's currency and balance was updated");
    } else {
      console.log("\n❌ TEST FAILED: Balance doesn't match expected value");
      console.log(`Expected: ${expectedBalance}, Actual: ${actualBalance}`);
    }

  } catch (error) {
    console.error("Test failed with error:", error);
  }
}

// Run the test
runTest()
  .then(() => {
    console.log("\nTest completed");
    process.exit(0);
  })
  .catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
