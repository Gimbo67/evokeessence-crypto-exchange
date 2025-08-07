/**
 * This file contains the changes needed to add contractor analytics to the admin dashboard.
 * 
 * Step 1: Add this code after line 462 in server/routes.ts:
 */

// Contractor commission rate constant
const CONTRACTOR_COMMISSION_RATE = 0.0085; // 0.85%

// Calculate contractor statistics
const contractorCount = contractors.length;

// Get deposits that were referred by contractors
const referredDeposits = deposits.filter(d => d.contractorId !== null && d.status === 'completed');
const referredDepositCount = referredDeposits.length;
const referredDepositAmount = referredDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);
const contractorCommissionAmount = referredDeposits.reduce((sum, d) => sum + Number(d.contractorCommission || 0), 0);

/**
 * Step 2: Modify line 479 in server/routes.ts:
 * Replace:
 *    commissionRate: COMMISSION_RATE
 * With:
 *    commissionRate: COMMISSION_RATE,
 *    contractors: {
 *      count: contractorCount,
 *      referredDeposits: referredDepositCount,
 *      referredAmount: referredDepositAmount,
 *      commissionAmount: contractorCommissionAmount
 *    }
 */