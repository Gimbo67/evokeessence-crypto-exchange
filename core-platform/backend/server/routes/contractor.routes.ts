import express, { Request, Response } from 'express';
import { db } from '../../db';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { sepaDeposits, users } from '../../db/schema';
import authMiddleware from '../middleware/auth.middleware';

const router = express.Router();

// Middleware to check if the authenticated user is a contractor
const checkContractorMiddleware = async (req: Request, res: Response, next: any) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get the user data to check if they're a contractor
    const userData = await db.query.users.findFirst({
      where: eq(users.id, req.user.id),
    });

    // A user is considered a contractor if their is_contractor flag is true OR they have a non-empty referral_code
    if (!userData || (!userData.is_contractor && !userData.referral_code)) {
      return res.status(403).json({ error: 'Access denied. Contractor privileges required.' });
    }

    next();
  } catch (error) {
    console.error('Contractor middleware error:', error);
    return res.status(500).json({ error: 'Failed to verify contractor status' });
  }
};

// Route to get deposits from clients who used the contractor's referral code
router.get('/deposits', [authMiddleware.isAuthenticated, checkContractorMiddleware], async (req: Request, res: Response) => {
  try {
    const contractorId = req.user!.id;
    
    // Get contractor data to access referral code
    const contractor = await db.query.users.findFirst({
      where: eq(users.id, contractorId),
      columns: {
        referral_code: true,
      },
    });
    
    if (!contractor || !contractor.referral_code) {
      return res.status(404).json({ error: 'Contractor or referral code not found' });
    }
    
    // Get deposits where this contractor is referenced by ID
    const contractorDeposits = await db.query.sepaDeposits.findMany({
      where: eq(sepaDeposits.contractorId, contractorId),
      orderBy: [sql`${sepaDeposits.createdAt} DESC`],
    });
    
    // Get deposits where this contractor's referral code is used
    const referralCodeDeposits = await db.query.sepaDeposits.findMany({
      where: eq(sepaDeposits.referralCode, contractor.referral_code),
      orderBy: [sql`${sepaDeposits.createdAt} DESC`],
    });
    
    // Combine both sets of deposits, removing duplicates by ID
    const depositMap = new Map();
    [...contractorDeposits, ...referralCodeDeposits].forEach(deposit => {
      depositMap.set(deposit.id, deposit);
    });
    
    // Final list of all deposits
    const deposits = Array.from(depositMap.values());

    // Get user information for each deposit
    const userIds = [...new Set(deposits.map(d => d.userId))];
    const usersData = await db.query.users.findMany({
      where: sql`${users.id} IN (${userIds.join(',')})`,
      columns: {
        id: true,
        username: true,
      },
    });

    // Create a map of user IDs to usernames
    const userMap = new Map(usersData.map(u => [u.id, u.username]));

    // Add username to each deposit
    const depositsWithUsernames = deposits.map(deposit => ({
      ...deposit,
      clientUsername: userMap.get(deposit.userId) || null,
      commission: deposit.contractorCommission,
    }));

    return res.json(depositsWithUsernames);
  } catch (error) {
    console.error('Error fetching contractor deposits:', error);
    return res.status(500).json({ error: 'Failed to fetch deposit data' });
  }
});

// Route to get summary data for the contractor dashboard
router.get('/summary', [authMiddleware.isAuthenticated, checkContractorMiddleware], async (req: Request, res: Response) => {
  try {
    const contractorId = req.user!.id;
    
    // Get contractor data to access referral code
    const contractor = await db.query.users.findFirst({
      where: eq(users.id, contractorId),
      columns: {
        referral_code: true,
      },
    });
    
    if (!contractor || !contractor.referral_code) {
      return res.status(404).json({ error: 'Contractor or referral code not found' });
    }
    
    // Get deposits where this contractor is referenced by ID
    const contractorDeposits = await db.query.sepaDeposits.findMany({
      where: eq(sepaDeposits.contractorId, contractorId),
    });
    
    // Get deposits where this contractor's referral code is used
    const referralCodeDeposits = await db.query.sepaDeposits.findMany({
      where: eq(sepaDeposits.referralCode, contractor.referral_code),
    });
    
    // Combine both sets of deposits, removing duplicates by ID
    const depositMap = new Map();
    [...contractorDeposits, ...referralCodeDeposits].forEach(deposit => {
      depositMap.set(deposit.id, deposit);
    });
    
    // Final list of all deposits
    const deposits = Array.from(depositMap.values());

    // 2. Calculate total commission earned (only completed deposits)
    const totalCommissionEarned = deposits
      .filter(d => d.status === 'completed')
      .reduce((sum, d) => sum + Number(d.contractorCommission || 0), 0);

    // 3. Calculate total deposited amount (only completed deposits)
    const totalReferredDeposits = deposits
      .filter(d => d.status === 'completed')
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);

    // 4. Get count of unique active users who have made deposits
    const activeReferrals = [...new Set(deposits.map(d => d.userId))].length;

    // 5. Calculate pending commissions
    const pendingCommissions = deposits
      .filter(d => d.status === 'pending')
      .reduce((sum, d) => sum + Number(d.contractorCommission || 0), 0);

    return res.json({
      totalCommissionEarned,
      totalReferredDeposits,
      activeReferrals,
      pendingCommissions,
    });
  } catch (error) {
    console.error('Error fetching contractor summary:', error);
    return res.status(500).json({ error: 'Failed to fetch summary data' });
  }
});

// Route to get the contractor's profile and referral data
router.get('/profile', [authMiddleware.isAuthenticated, checkContractorMiddleware], async (req: Request, res: Response) => {
  try {
    const contractorId = req.user!.id;

    const contractor = await db.query.users.findFirst({
      where: eq(users.id, contractorId),
      columns: {
        id: true,
        username: true,
        email: true,
        full_name: true,
        referral_code: true,
        contractor_commission_rate: true,
      },
    });

    if (!contractor) {
      return res.status(404).json({ error: 'Contractor profile not found' });
    }

    // Count total referrals
    const referralCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(eq(users.referred_by, contractor.referral_code));

    return res.json({
      ...contractor,
      referralCount: referralCount[0]?.count || 0,
    });
  } catch (error) {
    console.error('Error fetching contractor profile:', error);
    return res.status(500).json({ error: 'Failed to fetch profile data' });
  }
});

// Route to get comprehensive analytics for the contractor
router.get('/analytics', [authMiddleware.isAuthenticated, checkContractorMiddleware], async (req: Request, res: Response) => {
  try {
    const contractorId = req.user!.id;
    
    // Get contractor profile data
    const contractor = await db.query.users.findFirst({
      where: eq(users.id, contractorId),
      columns: {
        id: true,
        username: true, 
        full_name: true,
        referral_code: true,
        contractor_commission_rate: true,
      },
    });
    
    if (!contractor) {
      return res.status(404).json({ error: 'Contractor profile not found' });
    }
    
    // Get all deposits associated with this contractor directly by contractor ID
    const contractorDeposits = await db.query.sepaDeposits.findMany({
      where: eq(sepaDeposits.contractorId, contractorId),
      orderBy: [sql`${sepaDeposits.createdAt} DESC`],
    });
    
    // Get all deposits that have this contractor's referral code
    const referralCodeDeposits = await db.query.sepaDeposits.findMany({
      where: eq(sepaDeposits.referralCode, contractor.referral_code),
      orderBy: [sql`${sepaDeposits.createdAt} DESC`],
    });
    
    // Combine both sets of deposits, removing duplicates by ID
    const depositMap = new Map();
    [...contractorDeposits, ...referralCodeDeposits].forEach(deposit => {
      depositMap.set(deposit.id, deposit);
    });
    
    // Final list of all deposits
    const deposits = Array.from(depositMap.values());
    
    // Get all users who used this contractor's referral code
    const referredUsers = await db.query.users.findMany({
      where: eq(users.referred_by, contractor.referral_code),
      columns: {
        id: true,
        username: true,
        full_name: true,
        email: true,
      },
    });
    
    // Create user ID to user data map for quick lookups
    const userMap = new Map(referredUsers.map(u => [u.id, u]));
    
    // Group deposits by user
    const depositsByUser = deposits.reduce((acc, deposit) => {
      const userId = deposit.userId;
      if (!acc[userId]) {
        acc[userId] = [];
      }
      acc[userId].push(deposit);
      return acc;
    }, {} as Record<number, typeof deposits>);
    
    // Prepare referred clients data with their deposit counts
    const referredClients = referredUsers.map(user => {
      const userDeposits = depositsByUser[user.id] || [];
      const totalDeposits = userDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);
      const completedDeposits = userDeposits.filter(d => d.status === 'completed');
      
      return {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        depositCount: userDeposits.length,
        completedDepositCount: completedDeposits.length,
        totalDeposited: totalDeposits,
      };
    });
    
    // Calculate analytics totals
    const totalReferredDeposits = deposits.filter(d => d.status === 'completed')
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);
    
    const totalCommission = deposits.filter(d => d.status === 'completed')
      .reduce((sum, d) => sum + Number(d.contractorCommission || 0), 0);
    
    // Format referred deposits for display
    const referredDeposits = deposits.map(deposit => ({
      id: deposit.id,
      userId: deposit.userId,
      username: userMap.get(deposit.userId)?.username || 'Unknown',
      fullName: userMap.get(deposit.userId)?.full_name || null,
      amount: deposit.amount,
      currency: deposit.currency,
      status: deposit.status,
      contractorCommission: deposit.contractorCommission,
      createdAt: deposit.createdAt,
      completedAt: deposit.completedAt,
    }));
    
    return res.json({
      referralCode: contractor.referral_code,
      contractorCommissionRate: contractor.contractor_commission_rate,
      referredClientsCount: referredUsers.length,
      totalReferredDeposits,
      totalCommission,
      referredClients,
      referredDeposits,
    });
  } catch (error) {
    console.error('Error fetching contractor analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Route to get referrals for a contractor
router.get('/referrals', [authMiddleware.isAuthenticated, checkContractorMiddleware], async (req: Request, res: Response) => {
  try {
    const contractorId = req.user!.id;
    
    // Get contractor data to access referral code
    const contractor = await db.query.users.findFirst({
      where: eq(users.id, contractorId),
      columns: {
        id: true,
        username: true,
        referral_code: true,
        contractor_commission_rate: true,
      },
    });
    
    if (!contractor || !contractor.referral_code) {
      return res.status(404).json({ error: 'Contractor or referral code not found' });
    }
    
    // Get users referred by this contractor's code
    const referredUsers = await db.query.users.findMany({
      where: eq(users.referred_by, contractor.referral_code),
      columns: {
        id: true,
        username: true,
        full_name: true,
        email: true,
        created_at: true,
      },
    });
    
    // Get total users referred count
    const referredCount = referredUsers.length;
    
    // Get all deposits from referred users
    const allUserIds = referredUsers.map(user => user.id);
    
    // First get deposits from users who have the referral code saved in their profile
    const userDeposits = allUserIds.length > 0 
      ? await db.query.sepaDeposits.findMany({
          where: sql`${sepaDeposits.userId} IN (${allUserIds.join(',')})`,
          orderBy: [sql`${sepaDeposits.createdAt} DESC`],
        })
      : [];
      
    // Then get all deposits that have the referral code directly set on the deposit
    const codeDeposits = await db.query.sepaDeposits.findMany({
      where: eq(sepaDeposits.referralCode, contractor.referral_code),
      orderBy: [sql`${sepaDeposits.createdAt} DESC`],
    });
    
    // Combine both sets of deposits, removing duplicates by ID
    const depositMap = new Map();
    [...userDeposits, ...codeDeposits].forEach(deposit => {
      depositMap.set(deposit.id, deposit);
    });
    
    const referralDeposits = Array.from(depositMap.values());
    
    // Calculate completed deposits and total amount
    const completedDeposits = referralDeposits.filter(d => d.status === 'completed');
    const totalDepositAmount = completedDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    
    // Calculate total commission
    const totalCommission = completedDeposits.reduce((sum, d) => sum + Number(d.contractorCommission || 0), 0);
    
    return res.json({
      referralCode: contractor.referral_code,
      commissionRate: contractor.contractor_commission_rate,
      totalReferrals: referredCount,
      referredUsers: referredUsers.map(user => ({
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        joinedAt: user.created_at,
      })),
      totalDeposits: referralDeposits.length,
      completedDeposits: completedDeposits.length,
      totalDepositAmount,
      totalCommission,
      recentDeposits: referralDeposits.slice(0, 10).map(deposit => ({
        id: deposit.id,
        userId: deposit.userId,
        amount: deposit.amount,
        currency: deposit.currency,
        status: deposit.status,
        commission: deposit.contractorCommission,
        createdAt: deposit.createdAt,
        completedAt: deposit.completedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching contractor referrals:', error);
    return res.status(500).json({ error: 'Failed to fetch referral data' });
  }
});

export default router;