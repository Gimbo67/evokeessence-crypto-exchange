import express, { Request, Response } from 'express';
import fs from 'fs-extra';
import path from 'path';
import { requireAdminAccess } from '../middleware/auth';
import { 
  getBannedIps, 
  unbanIp,
  logAbuse,
  isIpBanned
} from '../middleware/abuse-detection';
import { ensureJsonResponse } from '../middleware/api-response';

export const adminSecurityRouter = express.Router();

// Ensure only admins can access these routes and always return JSON
adminSecurityRouter.use(requireAdminAccess);
adminSecurityRouter.use(ensureJsonResponse);

// File paths
const ABUSE_LOG_FILE = path.join(process.cwd(), 'abuse.log');

/**
 * @route GET /api/admin/security/dashboard
 * @desc Get security dashboard data including abuse logs and banned IPs
 * @access Admin only
 */
adminSecurityRouter.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // Read and parse the abuse log
    let abuseLog: string[] = [];
    if (await fs.pathExists(ABUSE_LOG_FILE)) {
      const logContent = await fs.readFile(ABUSE_LOG_FILE, 'utf8');
      abuseLog = logContent.split('\n').filter(line => line.trim() !== '');
    }

    // Get banned IPs
    const bannedIps = await getBannedIps();
    const bannedIpsList = Object.keys(bannedIps).map(ip => ({
      ip,
      bannedUntil: new Date(bannedIps[ip]).toISOString(),
      timeRemaining: Math.max(0, Math.floor((bannedIps[ip] - Date.now()) / 1000))
    }));

    // Return dashboard data
    res.json({
      success: true,
      data: {
        abuseLog,
        bannedIps: bannedIpsList,
        totalBannedIps: bannedIpsList.length,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Admin Security] Error fetching dashboard data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching security dashboard data'
    });
  }
});

/**
 * @route GET /api/admin/security/banned-ips
 * @desc Get list of banned IPs
 * @access Admin only
 */
adminSecurityRouter.get('/banned-ips', async (req: Request, res: Response) => {
  try {
    const bannedIps = await getBannedIps();
    const bannedIpsList = Object.keys(bannedIps).map(ip => ({
      ip,
      bannedUntil: new Date(bannedIps[ip]).toISOString(),
      timeRemaining: Math.max(0, Math.floor((bannedIps[ip] - Date.now()) / 1000))
    }));

    res.json({
      success: true,
      data: bannedIpsList
    });
  } catch (error) {
    console.error('[Admin Security] Error fetching banned IPs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching banned IPs'
    });
  }
});

/**
 * @route POST /api/admin/security/unban
 * @desc Unban an IP address
 * @access Admin only
 */
adminSecurityRouter.post('/unban', async (req: Request, res: Response) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({ 
        success: false, 
        message: 'IP address is required'
      });
    }

    // Check if IP is actually banned
    const isBanned = await isIpBanned(ip);
    if (!isBanned) {
      return res.status(400).json({ 
        success: false, 
        message: 'This IP address is not currently banned'
      });
    }

    // Unban the IP
    const adminUser = req.user?.username || 'admin';
    const success = await unbanIp(ip, adminUser);

    if (success) {
      return res.json({ 
        success: true, 
        message: `IP ${ip} has been unbanned successfully`
      });
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Failed to unban IP address'
      });
    }
  } catch (error) {
    console.error('[Admin Security] Error unbanning IP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error unbanning IP address'
    });
  }
});

/**
 * @route GET /api/admin/security/logs
 * @desc Get abuse logs with optional filtering
 * @access Admin only
 */
adminSecurityRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const { ip, date, page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    
    // Read abuse log
    let abuseLog: string[] = [];
    if (await fs.pathExists(ABUSE_LOG_FILE)) {
      const logContent = await fs.readFile(ABUSE_LOG_FILE, 'utf8');
      abuseLog = logContent.split('\n').filter(line => line.trim() !== '');
    }
    
    // Apply filters if provided
    let filteredLog = abuseLog;
    if (ip) {
      filteredLog = filteredLog.filter(line => line.includes(`IP ${ip}`));
    }
    if (date) {
      const dateStr = date as string;
      filteredLog = filteredLog.filter(line => line.includes(`[${dateStr}`));
    }
    
    // Paginate results
    const totalLogs = filteredLog.length;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedLogs = filteredLog.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          total: totalLogs,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalLogs / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('[Admin Security] Error fetching abuse logs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching abuse logs'
    });
  }
});

/**
 * @route GET /api/admin/security/stats
 * @desc Get security statistics
 * @access Admin only
 */
adminSecurityRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    // Read abuse log
    let abuseLog: string[] = [];
    if (await fs.pathExists(ABUSE_LOG_FILE)) {
      const logContent = await fs.readFile(ABUSE_LOG_FILE, 'utf8');
      abuseLog = logContent.split('\n').filter(line => line.trim() !== '');
    }
    
    // Get banned IPs
    const bannedIps = await getBannedIps();
    const bannedIpsList = Object.keys(bannedIps);
    
    // Calculate statistics
    const totalLogEntries = abuseLog.length;
    const blockedIpEntries = abuseLog.filter(line => line.includes('Blocked IP')).length;
    const unbannedEntries = abuseLog.filter(line => line.includes('unbanned by')).length;
    const rateLimitExceededEntries = abuseLog.filter(line => line.includes('Rate limit exceeded')).length;
    
    res.json({
      success: true,
      data: {
        totalLogEntries,
        blockedIpEntries,
        unbannedEntries,
        rateLimitExceededEntries,
        currentlyBannedIps: bannedIpsList.length,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Admin Security] Error fetching security stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching security statistics'
    });
  }
});

/**
 * @route POST /api/admin/security/manual-ban
 * @desc Manually ban an IP address
 * @access Admin only
 */
adminSecurityRouter.post('/manual-ban', async (req: Request, res: Response) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({ 
        success: false, 
        message: 'IP address is required'
      });
    }
    
    // Check if IP is already banned
    const isBanned = await isIpBanned(ip);
    if (isBanned) {
      return res.status(400).json({ 
        success: false, 
        message: 'This IP address is already banned'
      });
    }
    
    // Get banned IPs
    const bannedIps = await getBannedIps();
    
    // Ban for 1 hour (3600000 milliseconds)
    const banExpiryTime = Date.now() + 3600000;
    const updatedBannedIps = { ...bannedIps, [ip]: banExpiryTime };
    
    // Save banned IPs
    await fs.writeJson(path.join(process.cwd(), 'banned-ips.json'), { 
      bannedIps: updatedBannedIps,
      updatedAt: new Date().toISOString()
    });
    
    // Log the manual ban
    const adminUser = req.user?.username || 'admin';
    await logAbuse(`IP ${ip} manually banned by ${adminUser}`);
    
    res.json({ 
      success: true, 
      message: `IP ${ip} has been banned for 1 hour`
    });
  } catch (error) {
    console.error('[Admin Security] Error manually banning IP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error banning IP address'
    });
  }
});