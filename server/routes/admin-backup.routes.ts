import express, { Request, Response, Router } from 'express';
import { requireAuthentication } from '../middleware/auth';
import { requireAdminAccess } from '../middleware/admin';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export const adminBackupRouter = express.Router();

// Middleware for all backup routes
adminBackupRouter.use(requireAuthentication, requireAdminAccess);

// Backup system configuration
const BACKUP_DIR = path.resolve('./backups');
const SERVERS_CONFIG_FILE = path.resolve('./backups/servers.json');

/**
 * @route GET /api/admin/backup/status
 * @desc Get backup system status and statistics
 * @access Admin only
 */
adminBackupRouter.get('/status', async (req: Request, res: Response) => {
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.status(404).json({ 
        error: 'Backup directory not found',
        message: 'Backup system may not be properly configured' 
      });
    }

    // Get database backups
    const dbBackups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('db_backup_') && file.endsWith('.sql'))
      .map(file => {
        const stats = fs.statSync(path.join(BACKUP_DIR, file));
        const fileDate = file.match(/db_backup_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})\.sql/);
        const date = fileDate ? `${fileDate[1]} ${fileDate[2].replace(/-/g, ':')}` : 'Unknown';
        
        // Check if verified (has a checksum file)
        const isVerified = fs.existsSync(path.join(BACKUP_DIR, `${file}.sha256`));
        
        return {
          filename: file,
          size: stats.size,
          date: date,
          created: stats.mtime,
          verified: isVerified
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime()); // Sort newest first

    // Get file backups
    const fileBackups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('files_backup_') && file.endsWith('.tar.gz'))
      .map(file => {
        const stats = fs.statSync(path.join(BACKUP_DIR, file));
        const fileDate = file.match(/files_backup_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})\.tar\.gz/);
        const date = fileDate ? `${fileDate[1]} ${fileDate[2].replace(/-/g, ':')}` : 'Unknown';
        
        // Check if verified (has a checksum file)
        const isVerified = fs.existsSync(path.join(BACKUP_DIR, `${file}.sha256`));
        
        return {
          filename: file,
          size: stats.size,
          date: date,
          created: stats.mtime,
          verified: isVerified
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime()); // Sort newest first
      
    // Get incremental backups if any
    const incrementalBackups = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('incr_backup_') && file.endsWith('.tar.gz'))
      .map(file => {
        const stats = fs.statSync(path.join(BACKUP_DIR, file));
        const fileDate = file.match(/incr_backup_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})\.tar\.gz/);
        const date = fileDate ? `${fileDate[1]} ${fileDate[2].replace(/-/g, ':')}` : 'Unknown';
        
        return {
          filename: file,
          size: stats.size,
          date: date,
          created: stats.mtime
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime()); // Sort newest first

    // Get cloud backups info
    let cloudBackups: any[] = [];
    const cloudLogPath = path.join(BACKUP_DIR, 'cloud_backup.log');
    if (fs.existsSync(cloudLogPath)) {
      const cloudLog = fs.readFileSync(cloudLogPath, 'utf-8');
      // Extract successful uploads from log
      const uploadMatches = cloudLog.match(/Successfully uploaded (.*?) to (AWS|GCP|Azure)/g);
      if (uploadMatches) {
        const uniqueUploads = new Set<string>();
        uploadMatches.forEach(match => {
          const parts = match.match(/Successfully uploaded (.*?) to (AWS|GCP|Azure)/);
          if (parts && parts.length >= 3) {
            uniqueUploads.add(JSON.stringify({
              filename: parts[1],
              provider: parts[2]
            }));
          }
        });
        
        cloudBackups = Array.from(uniqueUploads).map(json => JSON.parse(json));
      }
    }

    // Get verification status
    let verificationStatus: { lastRun: Date | null; success: boolean; summary: string } = { 
      lastRun: null, 
      success: false, 
      summary: '' 
    };
    const verificationLogPath = path.join(BACKUP_DIR, 'verification.log');
    if (fs.existsSync(verificationLogPath)) {
      const verificationLog = fs.readFileSync(verificationLogPath, 'utf-8');
      // Extract the latest verification run
      const dateMatch = verificationLog.match(/Date: (.*)/);
      if (dateMatch && dateMatch[1]) {
        try {
          verificationStatus.lastRun = new Date(dateMatch[1]);
        } catch (e) {
          console.error('Error parsing date:', e);
        }
      }
      
      // Check if verification was successful (no failures)
      const successMatch = verificationLog.match(/All backup verifications successful/);
      verificationStatus.success = !!successMatch;
      
      // Get summary
      const summaryMatch = verificationLog.match(/=== Verification Summary ===([\s\S]*?)(?=\n\n|$)/);
      if (summaryMatch && summaryMatch[1]) {
        verificationStatus.summary = summaryMatch[1].trim();
      }
    }

    // Calculate total storage used by backups
    const getTotalSize = (backups: any[]) => {
      return backups.reduce((total, backup) => total + backup.size, 0);
    };
    
    const totalDbBackupSize = getTotalSize(dbBackups);
    const totalFileBackupSize = getTotalSize(fileBackups);
    const totalIncrBackupSize = getTotalSize(incrementalBackups);
    const totalBackupSize = totalDbBackupSize + totalFileBackupSize + totalIncrBackupSize;

    // Get remote servers configuration if it exists
    let remoteServers: any[] = [];
    if (fs.existsSync(SERVERS_CONFIG_FILE)) {
      try {
        const serversConfig = JSON.parse(fs.readFileSync(SERVERS_CONFIG_FILE, 'utf-8'));
        remoteServers = serversConfig.servers || [];
      } catch (err) {
        console.error('Error parsing servers configuration:', err);
      }
    }

    // Get cron job status
    let cronStatus = 'Unknown';
    try {
      const { stdout } = await execPromise('crontab -l | grep backup.sh');
      cronStatus = stdout ? 'Active' : 'Not configured';
    } catch (err) {
      cronStatus = 'Not configured';
    }

    // Prepare response
    const response = {
      status: 'operational',
      statistics: {
        totalBackups: dbBackups.length + fileBackups.length + incrementalBackups.length,
        dbBackups: dbBackups.length,
        fileBackups: fileBackups.length,
        incrementalBackups: incrementalBackups.length,
        totalSize: totalBackupSize,
        totalSizeFormatted: formatBytes(totalBackupSize),
        latestDbBackup: dbBackups.length > 0 ? dbBackups[0] : null,
        latestFileBackup: fileBackups.length > 0 ? fileBackups[0] : null,
        latestIncrementalBackup: incrementalBackups.length > 0 ? incrementalBackups[0] : null,
        cloudBackups: cloudBackups.length
      },
      verification: verificationStatus,
      configuration: {
        backupDirectory: BACKUP_DIR,
        cronStatus,
        remoteServersConfigured: remoteServers.length,
        cloudBackupEnabled: cloudBackups.length > 0
      },
      recentBackups: {
        database: dbBackups.slice(0, 5),
        files: fileBackups.slice(0, 5),
        incremental: incrementalBackups.slice(0, 5),
        cloud: cloudBackups.slice(0, 5)
      },
      remoteServers: remoteServers.map((server: any) => ({
        name: server.name,
        address: server.address,
        status: server.status || 'Unknown'
      }))
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error getting backup status:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      message: 'Failed to retrieve backup status' 
    });
  }
});

/**
 * @route GET /api/admin/backup/logs
 * @desc Get backup system logs
 * @access Admin only
 */
adminBackupRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const logType = req.query.type || 'backup';
    let logPath = '';
    
    switch (logType) {
      case 'backup':
        logPath = path.join(BACKUP_DIR, 'backup_log.txt');
        break;
      case 'restore':
        logPath = path.join(BACKUP_DIR, 'restore_log.txt');
        break;
      case 'cron':
        logPath = path.join(BACKUP_DIR, 'cron_backup.log');
        break;
      case 'verification':
        logPath = path.join(BACKUP_DIR, 'verification.log');
        break;
      case 'cloud':
        logPath = path.join(BACKUP_DIR, 'cloud_backup.log');
        break;
      default:
        return res.status(400).json({ error: 'Invalid log type' });
    }
    
    if (!fs.existsSync(logPath)) {
      return res.status(404).json({ error: 'Log file not found' });
    }
    
    // Read last 100 lines (or less if file is smaller)
    const logContent = fs.readFileSync(logPath, 'utf-8');
    const lines = logContent.split('\n');
    const lastLines = lines.slice(Math.max(lines.length - 100, 0));
    
    return res.status(200).json({ 
      type: logType,
      filename: path.basename(logPath),
      lines: lastLines 
    });
  } catch (error) {
    console.error('Error getting backup logs:', error);
    return res.status(500).json({ error: 'Failed to retrieve backup logs' });
  }
});

/**
 * @route POST /api/admin/backup/trigger
 * @desc Trigger a manual backup
 * @access Admin only
 */
adminBackupRouter.post('/trigger', async (req: Request, res: Response) => {
  try {
    const backupType = req.body.type || 'full'; // full, database, files, incremental
    
    // Start backup process
    const backupScript = path.resolve('./scripts/backup.sh');
    
    if (!fs.existsSync(backupScript)) {
      return res.status(404).json({ error: 'Backup script not found' });
    }
    
    // Execute backup asynchronously
    let command = `${backupScript}`;
    if (backupType !== 'full') {
      command += ` --type=${backupType}`;
    }
    
    // Execute in background to prevent request timeout
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Backup error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Backup stderr: ${stderr}`);
        return;
      }
      console.log(`Backup triggered: ${stdout}`);
    });
    
    return res.status(200).json({ 
      message: 'Backup initiated',
      type: backupType
    });
  } catch (error) {
    console.error('Error triggering backup:', error);
    return res.status(500).json({ error: 'Failed to trigger backup' });
  }
});

/**
 * @route POST /api/admin/backup/verify
 * @desc Trigger backup verification
 * @access Admin only
 */
adminBackupRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const level = req.body.level || 'basic'; // basic, thorough, full
    
    // Start verification process
    const verifyScript = path.resolve('./scripts/verify-backups.sh');
    
    if (!fs.existsSync(verifyScript)) {
      return res.status(404).json({ error: 'Verification script not found' });
    }
    
    // Execute verification asynchronously
    const command = `${verifyScript} --level=${level}`;
    
    // Execute in background to prevent request timeout
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Verification error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Verification stderr: ${stderr}`);
        return;
      }
      console.log(`Verification triggered: ${stdout}`);
    });
    
    return res.status(200).json({ 
      message: 'Verification initiated',
      level
    });
  } catch (error) {
    console.error('Error triggering verification:', error);
    return res.status(500).json({ error: 'Failed to trigger verification' });
  }
});

/**
 * @route POST /api/admin/backup/cloud
 * @desc Trigger cloud backup
 * @access Admin only
 */
adminBackupRouter.post('/cloud', async (req: Request, res: Response) => {
  try {
    const provider = req.body.provider; // aws, gcp, azure
    const encrypt = req.body.encrypt === undefined ? true : !!req.body.encrypt;
    
    // Start cloud backup process
    const cloudScript = path.resolve('./scripts/cloud-backup.sh');
    
    if (!fs.existsSync(cloudScript)) {
      return res.status(404).json({ error: 'Cloud backup script not found' });
    }
    
    // Build command
    let command = cloudScript;
    if (provider) {
      command += ` --cloud=${provider}`;
    }
    command += ` --encrypt=${encrypt ? 'true' : 'false'}`;
    
    // Execute in background to prevent request timeout
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Cloud backup error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Cloud backup stderr: ${stderr}`);
        return;
      }
      console.log(`Cloud backup triggered: ${stdout}`);
    });
    
    return res.status(200).json({ 
      message: 'Cloud backup initiated',
      provider: provider || 'default',
      encrypt
    });
  } catch (error) {
    console.error('Error triggering cloud backup:', error);
    return res.status(500).json({ error: 'Failed to trigger cloud backup' });
  }
});

/**
 * @route GET /api/admin/backup/servers
 * @desc Get remote server configurations
 * @access Admin only
 */
adminBackupRouter.get('/servers', async (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(SERVERS_CONFIG_FILE)) {
      return res.status(200).json({ servers: [] });
    }
    
    const serversConfig = JSON.parse(fs.readFileSync(SERVERS_CONFIG_FILE, 'utf-8'));
    return res.status(200).json(serversConfig);
  } catch (error) {
    console.error('Error getting server configurations:', error);
    return res.status(500).json({ error: 'Failed to get server configurations' });
  }
});

/**
 * @route POST /api/admin/backup/servers
 * @desc Add/update remote server configuration
 * @access Admin only
 */
adminBackupRouter.post('/servers', async (req: Request, res: Response) => {
  try {
    const { name, address, sshKey, username, port } = req.body;
    
    if (!name || !address) {
      return res.status(400).json({ error: 'Server name and address are required' });
    }
    
    // Create or update servers configuration
    let serversConfig: any = { servers: [] };
    if (fs.existsSync(SERVERS_CONFIG_FILE)) {
      serversConfig = JSON.parse(fs.readFileSync(SERVERS_CONFIG_FILE, 'utf-8'));
    }
    
    // Check if server with this name already exists
    const existingIndex = serversConfig.servers.findIndex((s: any) => s.name === name);
    
    const serverConfig = {
      name,
      address,
      sshKey: sshKey || '',
      username: username || 'root',
      port: port || 22,
      status: 'Pending',
      lastSync: null
    };
    
    if (existingIndex >= 0) {
      // Update existing server
      serversConfig.servers[existingIndex] = {
        ...serversConfig.servers[existingIndex],
        ...serverConfig
      };
    } else {
      // Add new server
      serversConfig.servers.push(serverConfig);
    }
    
    // Save configuration
    fs.writeFileSync(SERVERS_CONFIG_FILE, JSON.stringify(serversConfig, null, 2));
    
    return res.status(200).json({ 
      message: existingIndex >= 0 ? 'Server updated' : 'Server added',
      server: serverConfig
    });
  } catch (error) {
    console.error('Error saving server configuration:', error);
    return res.status(500).json({ error: 'Failed to save server configuration' });
  }
});

/**
 * @route DELETE /api/admin/backup/servers/:name
 * @desc Remove a remote server configuration
 * @access Admin only
 */
adminBackupRouter.delete('/servers/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    
    if (!fs.existsSync(SERVERS_CONFIG_FILE)) {
      return res.status(404).json({ error: 'No server configurations found' });
    }
    
    let serversConfig = JSON.parse(fs.readFileSync(SERVERS_CONFIG_FILE, 'utf-8'));
    
    // Filter out the server with the specified name
    const initialCount = serversConfig.servers.length;
    serversConfig.servers = serversConfig.servers.filter((s: any) => s.name !== name);
    
    if (serversConfig.servers.length === initialCount) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Save updated configuration
    fs.writeFileSync(SERVERS_CONFIG_FILE, JSON.stringify(serversConfig, null, 2));
    
    return res.status(200).json({ 
      message: 'Server removed',
      name
    });
  } catch (error) {
    console.error('Error removing server configuration:', error);
    return res.status(500).json({ error: 'Failed to remove server configuration' });
  }
});

/**
 * @route POST /api/admin/backup/test-server
 * @desc Test connection to a remote server
 * @access Admin only
 */
adminBackupRouter.post('/test-server', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Server name is required' });
    }
    
    if (!fs.existsSync(SERVERS_CONFIG_FILE)) {
      return res.status(404).json({ error: 'No server configurations found' });
    }
    
    const serversConfig = JSON.parse(fs.readFileSync(SERVERS_CONFIG_FILE, 'utf-8'));
    const server = serversConfig.servers.find((s: any) => s.name === name);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Test SSH connection
    const sshOptions = server.sshKey 
      ? `-i ${server.sshKey}` 
      : '';
    
    const command = `ssh ${sshOptions} -p ${server.port} -o ConnectTimeout=5 -o BatchMode=yes ${server.username}@${server.address} echo "Connection successful"`;
    
    try {
      const { stdout } = await execPromise(command);
      
      // Update server status
      server.status = 'Connected';
      server.lastTested = new Date().toISOString();
      fs.writeFileSync(SERVERS_CONFIG_FILE, JSON.stringify(serversConfig, null, 2));
      
      return res.status(200).json({ 
        message: 'Connection successful',
        output: stdout.trim(),
        server
      });
    } catch (sshError: any) {
      // Update server status
      server.status = 'Error';
      server.lastTested = new Date().toISOString();
      server.lastError = sshError.message;
      fs.writeFileSync(SERVERS_CONFIG_FILE, JSON.stringify(serversConfig, null, 2));
      
      return res.status(200).json({ 
        message: 'Connection failed',
        error: sshError.message,
        server
      });
    }
  } catch (error) {
    console.error('Error testing server connection:', error);
    return res.status(500).json({ error: 'Failed to test server connection' });
  }
});

/**
 * @route POST /api/admin/backup/notifications
 * @desc Configure backup notification settings
 * @access Admin only
 */
adminBackupRouter.post('/notifications', async (req: Request, res: Response) => {
  try {
    const { email, level, enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Enabled flag must be a boolean'
      });
    }

    // Configure notifications based on the request
    let command = 'bash ./scripts/notification-manager.sh';
    
    if (email) {
      // Updating email configuration
      command = `bash ./scripts/notification-manager.sh --configure`;
    } else if (level) {
      // Updating notification level
      command = `bash ./scripts/notification-manager.sh --configure-level ${level} ${enabled ? 'true' : 'false'}`;
    } else {
      // Toggle notifications overall
      command = `bash ./scripts/notification-manager.sh --${enabled ? 'enable' : 'disable'}`;
    }
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Notification configuration error: ${error.message}`);
        return res.status(500).json({ 
          success: false, 
          message: `Failed to configure notifications: ${error.message}` 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Notification settings updated', 
        details: stdout 
      });
    });
  } catch (error) {
    console.error('Error configuring backup notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to configure backup notifications' });
  }
});

/**
 * @route GET /api/admin/backup/notifications
 * @desc Get backup notification settings
 * @access Admin only
 */
adminBackupRouter.get('/notifications', async (req: Request, res: Response) => {
  try {
    exec('bash ./scripts/notification-manager.sh --status', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error getting notification status: ${error.message}`);
        return res.status(500).json({ 
          success: false, 
          message: `Failed to get notification status: ${error.message}` 
        });
      }
      
      // Parse the output to get notification configuration
      const config: {
        enabled: boolean;
        email: {
          enabled: boolean;
          recipients: string[];
        };
        levels: {
          success: boolean;
          info: boolean;
          warning: boolean;
          error: boolean;
        };
        scheduled: boolean;
      } = {
        enabled: stdout.includes('Notifications: enabled'),
        email: {
          enabled: stdout.includes('Email notifications: enabled'),
          recipients: []
        },
        levels: {
          success: stdout.includes('Success level: enabled'),
          info: stdout.includes('Info level: enabled'),
          warning: stdout.includes('Warning level: enabled'),
          error: stdout.includes('Error level: enabled')
        },
        scheduled: stdout.includes('Scheduled reports: enabled')
      };
      
      // Extract recipients if available
      const recipientsMatch = stdout.match(/Recipients: (.+)/);
      if (recipientsMatch && recipientsMatch[1]) {
        config.email.recipients = recipientsMatch[1].split(',').map(email => email.trim());
      }
      
      res.json({ 
        success: true, 
        config
      });
    });
  } catch (error) {
    console.error('Error getting backup notification settings:', error);
    res.status(500).json({ success: false, message: 'Failed to get backup notification settings' });
  }
});

/**
 * @route POST /api/admin/backup/schedule
 * @desc Configure backup schedule
 * @access Admin only
 */
adminBackupRouter.post('/schedule', async (req: Request, res: Response) => {
  try {
    const { scheduleName, enabled, cronExpression } = req.body;
    
    if (!scheduleName) {
      return res.status(400).json({
        success: false,
        message: 'Schedule name is required'
      });
    }
    
    let command = `bash ./scripts/backup-scheduler.sh`;
    
    if (enabled !== undefined && cronExpression) {
      // Update schedule with new cron expression and enabled status
      command = `bash ./scripts/backup-scheduler.sh --update-schedule ${scheduleName} "${cronExpression}" ${enabled ? 'true' : 'false'}`;
    } else if (enabled !== undefined) {
      // Just update enabled status
      command = `bash ./scripts/backup-scheduler.sh --${enabled ? 'enable' : 'disable'}-schedule ${scheduleName}`;
    } else if (cronExpression) {
      // Just update cron expression
      command = `bash ./scripts/backup-scheduler.sh --set-schedule ${scheduleName} "${cronExpression}"`;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either enabled status or cron expression must be provided'
      });
    }
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Schedule configuration error: ${error.message}`);
        return res.status(500).json({ 
          success: false, 
          message: `Failed to configure schedule: ${error.message}` 
        });
      }
      
      res.json({ 
        success: true, 
        message: `Schedule ${scheduleName} updated successfully`, 
        details: stdout 
      });
    });
  } catch (error) {
    console.error('Error configuring backup schedule:', error);
    res.status(500).json({ success: false, message: 'Failed to configure backup schedule' });
  }
});

/**
 * @route GET /api/admin/backup/schedule
 * @desc Get backup schedule configuration
 * @access Admin only
 */
adminBackupRouter.get('/schedule', async (req: Request, res: Response) => {
  try {
    exec('bash ./scripts/backup-scheduler.sh --status', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error getting schedule status: ${error.message}`);
        return res.status(500).json({ 
          success: false, 
          message: `Failed to get schedule status: ${error.message}` 
        });
      }
      
      // Parse the output to extract schedule information
      const schedules: any[] = [];
      let currentSchedule: any = null;
      
      const lines = stdout.split('\n');
      for (const line of lines) {
        // New schedule definition
        const scheduleMatch = line.match(/\[(.+)\]/);
        if (scheduleMatch) {
          if (currentSchedule) {
            schedules.push(currentSchedule);
          }
          currentSchedule = { name: scheduleMatch[1], enabled: false };
          continue;
        }
        
        // Schedule properties
        if (currentSchedule) {
          const enabledMatch = line.match(/\s*Enabled:\s*(.+)/);
          if (enabledMatch) {
            currentSchedule.enabled = enabledMatch[1].trim() === 'true';
          }
          
          const descriptionMatch = line.match(/\s*Description:\s*(.+)/);
          if (descriptionMatch) {
            currentSchedule.description = descriptionMatch[1].trim();
          }
          
          const cronMatch = line.match(/\s*Cron:\s*(.+)/);
          if (cronMatch) {
            currentSchedule.cron = cronMatch[1].trim();
          }
          
          const componentsMatch = line.match(/\s*Components:\s*(.+)/);
          if (componentsMatch) {
            currentSchedule.components = componentsMatch[1].trim().split(', ');
          }
          
          const lastRunMatch = line.match(/\s*Last Run:\s*(.+)/);
          if (lastRunMatch) {
            currentSchedule.lastRun = lastRunMatch[1].trim();
          }
          
          const nextRunMatch = line.match(/\s*Next Run:\s*(.+)/);
          if (nextRunMatch) {
            currentSchedule.nextRun = nextRunMatch[1].trim();
          }
          
          const statusMatch = line.match(/\s*Status:\s*(.+)/);
          if (statusMatch) {
            currentSchedule.status = statusMatch[1].trim();
          }
        }
      }
      
      // Add the last schedule if there is one
      if (currentSchedule) {
        schedules.push(currentSchedule);
      }
      
      res.json({ 
        success: true, 
        schedules
      });
    });
  } catch (error) {
    console.error('Error getting backup schedule configuration:', error);
    res.status(500).json({ success: false, message: 'Failed to get backup schedule configuration' });
  }
});

/**
 * @route POST /api/admin/backup/geo-replication
 * @desc Configure geographic replication settings
 * @access Admin only
 */
adminBackupRouter.post('/geo-replication', async (req: Request, res: Response) => {
  try {
    const { enabled, region, action } = req.body;
    
    let command = 'bash ./scripts/geo-replication.sh';
    
    if (action === 'configure' && enabled !== undefined) {
      // Enable/disable geo-replication
      command = `bash ./scripts/geo-replication.sh --${enabled ? 'enable' : 'disable'}`;
    } else if (action === 'add-region' && region) {
      // Add a new region
      const { name, hostname, directory, user, keyPath, port = 22 } = region;
      
      if (!name || !hostname || !directory || !user || !keyPath) {
        return res.status(400).json({
          success: false,
          message: 'Missing required region parameters'
        });
      }
      
      command = `bash ./scripts/geo-replication.sh --add-region "${name}" "${hostname}" "${directory}" "${user}" "${keyPath}" "${port}"`;
    } else if (action === 'remove-region' && region) {
      // Remove a region
      command = `bash ./scripts/geo-replication.sh --remove-region "${region}"`;
    } else if (action === 'replicate') {
      // Trigger replication
      command = `bash ./scripts/geo-replication.sh --replicate`;
    } else if (action === 'test') {
      // Test regions
      if (region) {
        command = `bash ./scripts/geo-replication.sh --test-region "${region}"`;
      } else {
        command = `bash ./scripts/geo-replication.sh --test-regions`;
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action or missing parameters'
      });
    }
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Geo-replication configuration error: ${error.message}`);
        return res.status(500).json({ 
          success: false, 
          message: `Failed to configure geo-replication: ${error.message}` 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'Geo-replication settings updated', 
        details: stdout 
      });
    });
  } catch (error) {
    console.error('Error configuring geo-replication:', error);
    res.status(500).json({ success: false, message: 'Failed to configure geo-replication' });
  }
});

/**
 * @route GET /api/admin/backup/geo-replication
 * @desc Get geographic replication status
 * @access Admin only
 */
adminBackupRouter.get('/geo-replication', async (req: Request, res: Response) => {
  try {
    exec('bash ./scripts/geo-replication.sh --status', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error getting geo-replication status: ${error.message}`);
        return res.status(500).json({ 
          success: false, 
          message: `Failed to get geo-replication status: ${error.message}` 
        });
      }
      
      // Parse the output to get geo-replication details
      const lines = stdout.split('\n');
      
      const geoReplication = {
        enabled: false,
        regions: [] as any[],
        strategy: {},
        history: [] as any[]
      };
      
      // Extract enabled status
      const enabledMatch = lines.find(line => line.includes('Replication Enabled:'));
      if (enabledMatch) {
        geoReplication.enabled = enabledMatch.includes('true');
      }
      
      // Extract regions
      let currentRegion: any = null;
      let inRegionsSection = false;
      let inHistorySection = false;
      
      for (const line of lines) {
        if (line.includes('Configured Regions:')) {
          inRegionsSection = true;
          continue;
        }
        
        if (inRegionsSection && line.trim() === '') {
          inRegionsSection = false;
          if (currentRegion) {
            geoReplication.regions.push(currentRegion);
            currentRegion = null;
          }
          continue;
        }
        
        if (inRegionsSection) {
          const regionMatch = line.match(/\[(.+)\]/);
          if (regionMatch) {
            if (currentRegion) {
              geoReplication.regions.push(currentRegion);
            }
            currentRegion = { name: regionMatch[1] };
            continue;
          }
          
          if (currentRegion) {
            const descriptionMatch = line.match(/\s*Description:\s*(.+)/);
            if (descriptionMatch) {
              currentRegion.description = descriptionMatch[1].trim();
            }
            
            const typeMatch = line.match(/\s*Type:\s*(.+)/);
            if (typeMatch) {
              currentRegion.type = typeMatch[1].trim();
            }
            
            const hostnameMatch = line.match(/\s*Hostname:\s*(.+)/);
            if (hostnameMatch) {
              currentRegion.hostname = hostnameMatch[1].trim();
            }
            
            const statusMatch = line.match(/\s*Status:\s*(.+)/);
            if (statusMatch) {
              currentRegion.status = statusMatch[1].trim();
            }
          }
        }
        
        // Extract synchronization history
        if (line.includes('Recent Synchronization History:')) {
          inHistorySection = true;
          inRegionsSection = false;
          continue;
        }
        
        if (inHistorySection && line.match(/\s*\[\d{4}-\d{2}-\d{2}/)) {
          const historyEntry: any = { timestamp: line.trim().match(/\[([^\]]+)\]/)?.[1] };
          
          // Get next lines for details
          const index = lines.indexOf(line);
          if (index >= 0 && index + 4 < lines.length) {
            historyEntry.region = lines[index + 1].match(/Region:\s*(.+)/)?.[1]?.trim();
            historyEntry.status = lines[index + 2].match(/Status:\s*(.+)/)?.[1]?.trim();
            historyEntry.files = lines[index + 3].match(/Files:\s*(.+)/)?.[1]?.trim();
            historyEntry.duration = lines[index + 4].match(/Duration:\s*(.+)/)?.[1]?.trim();
          }
          
          geoReplication.history.push(historyEntry);
        }
      }
      
      // Add the last region if there is one
      if (currentRegion) {
        geoReplication.regions.push(currentRegion);
      }
      
      res.json({ 
        success: true, 
        geoReplication
      });
    });
  } catch (error) {
    console.error('Error getting geo-replication status:', error);
    res.status(500).json({ success: false, message: 'Failed to get geo-replication status' });
  }
});

/**
 * @route GET /api/admin/backup/monitoring
 * @desc Get backup system metrics for external monitoring systems
 * @access Admin only
 */
/**
 * @route GET /api/admin/backup/storage-analysis
 * @desc Get backup storage analysis data
 * @access Admin only
 */
adminBackupRouter.get('/storage-analysis', async (req: Request, res: Response) => {
  try {
    const reportFile = path.join(BACKUP_DIR, 'storage_report.txt');
    const chartFile = path.join(BACKUP_DIR, 'storage_chart.txt');
    const historyFile = path.join(BACKUP_DIR, 'storage_history.dat');
    
    // Run the analyzer if report doesn't exist
    if (!fs.existsSync(reportFile) || !fs.existsSync(chartFile)) {
      try {
        const analyzerScript = path.resolve('./scripts/backup-analyzer.sh');
        
        if (!fs.existsSync(analyzerScript)) {
          return res.status(404).json({ 
            error: 'Storage analyzer script not found',
            message: 'The backup storage analyzer component may not be installed'
          });
        }
        
        // Run the analyzer script
        await execPromise(`${analyzerScript} --report`);
      } catch (err) {
        console.error('Error running storage analyzer:', err);
        return res.status(500).json({ 
          error: 'Failed to generate storage analysis',
          message: 'Error running storage analyzer script'
        });
      }
    }
    
    // Check if files exist now
    if (!fs.existsSync(reportFile) || !fs.existsSync(chartFile)) {
      return res.status(404).json({ 
        error: 'Storage analysis files not found',
        message: 'Failed to generate storage analysis files'
      });
    }
    
    // Read report file
    const reportContent = fs.readFileSync(reportFile, 'utf-8');
    
    // Read chart file
    const chartContent = fs.readFileSync(chartFile, 'utf-8');
    
    // Define storage history data type
    interface StorageHistoryEntry {
      date: string;
      totalSize: number;
      dbSize: number;
      filesSize: number;
      incrementalSize: number;
      backupCount: number;
      totalSizeFormatted: string;
    }
    
    // Parse history data for trends if available
    let historyData: StorageHistoryEntry[] = [];
    if (fs.existsSync(historyFile)) {
      const historyContent = fs.readFileSync(historyFile, 'utf-8');
      const historyLines = historyContent.split('\n').filter(line => line.trim());
      
      // Skip header row
      if (historyLines.length > 1) {
        historyData = historyLines.slice(1).map(line => {
          const [date, totalSize, dbSize, filesSize, incrementalSize, backupCount] = line.split(',');
          return {
            date,
            totalSize: parseInt(totalSize, 10),
            dbSize: parseInt(dbSize, 10),
            filesSize: parseInt(filesSize, 10),
            incrementalSize: parseInt(incrementalSize, 10),
            backupCount: parseInt(backupCount, 10),
            totalSizeFormatted: formatBytes(parseInt(totalSize, 10))
          };
        });
      }
    }
    
    // Define growth metrics interface
    interface GrowthMetrics {
      dailyGrowth: number;
      weeklyGrowth: number;
      monthlyGrowth: number;
      projectedSizeIn30Days: number;
      projectedSizeIn90Days: number;
      daysUntilFull: number | null;
    }
    
    // Calculate growth metrics
    const growthMetrics: GrowthMetrics = {
      dailyGrowth: 0,
      weeklyGrowth: 0,
      monthlyGrowth: 0,
      projectedSizeIn30Days: 0,
      projectedSizeIn90Days: 0,
      daysUntilFull: null
    };
    
    if (historyData.length > 1) {
      // Sort by date ascending
      historyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const latestSize = historyData[historyData.length - 1].totalSize;
      const oldestSize = historyData[0].totalSize;
      const daysDiff = Math.max(1, (new Date(historyData[historyData.length - 1].date).getTime() - 
                                 new Date(historyData[0].date).getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate daily growth rate
      const dailyGrowth = (latestSize - oldestSize) / daysDiff;
      growthMetrics.dailyGrowth = dailyGrowth;
      growthMetrics.weeklyGrowth = dailyGrowth * 7;
      growthMetrics.monthlyGrowth = dailyGrowth * 30;
      
      // Projected sizes
      growthMetrics.projectedSizeIn30Days = latestSize + (dailyGrowth * 30);
      growthMetrics.projectedSizeIn90Days = latestSize + (dailyGrowth * 90);
      
      // Days until full
      // Get available space
      const { stdout } = await execPromise(`df -B1 --output=avail ${BACKUP_DIR} | tail -n 1`);
      const availableSpace = parseInt(stdout.trim(), 10);
      if (dailyGrowth > 0) {
        growthMetrics.daysUntilFull = Math.floor(availableSpace / dailyGrowth);
      }
    }
    
    return res.status(200).json({
      report: reportContent,
      chart: chartContent,
      history: historyData.slice(-30), // Last 30 data points
      growthMetrics: {
        dailyGrowth: growthMetrics.dailyGrowth,
        dailyGrowthFormatted: formatBytes(growthMetrics.dailyGrowth) + '/day',
        weeklyGrowth: growthMetrics.weeklyGrowth,
        weeklyGrowthFormatted: formatBytes(growthMetrics.weeklyGrowth) + '/week',
        monthlyGrowth: growthMetrics.monthlyGrowth,
        monthlyGrowthFormatted: formatBytes(growthMetrics.monthlyGrowth) + '/month',
        projectedSizeIn30Days: growthMetrics.projectedSizeIn30Days,
        projectedSizeIn30DaysFormatted: formatBytes(growthMetrics.projectedSizeIn30Days),
        projectedSizeIn90Days: growthMetrics.projectedSizeIn90Days,
        projectedSizeIn90DaysFormatted: formatBytes(growthMetrics.projectedSizeIn90Days),
        daysUntilFull: growthMetrics.daysUntilFull,
        warningLevel: growthMetrics.daysUntilFull !== null ? 
          (growthMetrics.daysUntilFull < 30 ? 'critical' : 
           growthMetrics.daysUntilFull < 90 ? 'warning' : 'normal') : 'normal'
      }
    });
    
  } catch (error) {
    console.error('Error retrieving storage analysis:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve storage analysis',
      message: 'An unexpected error occurred'
    });
  }
});

/**
 * @route GET /api/admin/backup/monitoring
 * @desc Get backup system metrics for external monitoring systems
 * @access Admin only
 */
adminBackupRouter.get('/monitoring', async (req: Request, res: Response) => {
  try {
    // Collect backup metrics from various sources
    const backupStatus = await new Promise<any>((resolve, reject) => {
      exec('bash ./scripts/backup-manager.sh --status', (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }
        resolve({ raw: stdout });
      });
    });

    // Extract metrics from status output
    const metrics = {
      timestamp: new Date().toISOString(),
      totalBackups: 0,
      lastBackupTime: null,
      lastVerificationTime: null,
      verificationStatus: 'unknown',
      totalBackupSize: 0,
      freeSpace: 0,
      usedSpace: 0,
      backupTypes: {
        database: 0,
        files: 0,
        incremental: 0
      },
      replicationStatus: 'unknown',
      healthStatus: 'ok'
    };

    // Process the raw status output
    const statusLines = backupStatus.raw.split('\n');
    
    for (const line of statusLines) {
      // Extract total backups
      const totalBackupsMatch = line.match(/Total Backups:\s*(\d+)/);
      if (totalBackupsMatch) {
        metrics.totalBackups = parseInt(totalBackupsMatch[1], 10);
      }
      
      // Extract database backups count
      const dbBackupsMatch = line.match(/Database Backups:\s*(\d+)/);
      if (dbBackupsMatch) {
        metrics.backupTypes.database = parseInt(dbBackupsMatch[1], 10);
      }
      
      // Extract file backups count
      const fileBackupsMatch = line.match(/File Backups:\s*(\d+)/);
      if (fileBackupsMatch) {
        metrics.backupTypes.files = parseInt(fileBackupsMatch[1], 10);
      }
      
      // Extract incremental backups count
      const incrementalBackupsMatch = line.match(/Incremental Backups:\s*(\d+)/);
      if (incrementalBackupsMatch) {
        metrics.backupTypes.incremental = parseInt(incrementalBackupsMatch[1], 10);
      }
      
      // Extract total size
      const totalSizeMatch = line.match(/Total Size:\s*(.+)/);
      if (totalSizeMatch) {
        metrics.totalBackupSize = totalSizeMatch[1];
      }
      
      // Extract free space
      const freeSpaceMatch = line.match(/Free Space:\s*(.+)/);
      if (freeSpaceMatch) {
        metrics.freeSpace = freeSpaceMatch[1];
      }
      
      // Extract verification status
      const verificationMatch = line.match(/Last Verification Status:\s*(.+)/);
      if (verificationMatch) {
        metrics.verificationStatus = verificationMatch[1];
      }
      
      // Extract last backup time
      const lastBackupMatch = line.match(/Last Backup:\s*(.+)/);
      if (lastBackupMatch) {
        metrics.lastBackupTime = lastBackupMatch[1];
      }
      
      // Extract last verification time
      const lastVerificationMatch = line.match(/Last Verification:\s*(.+)/);
      if (lastVerificationMatch) {
        metrics.lastVerificationTime = lastVerificationMatch[1];
      }
    }

    // Check geo-replication status if enabled
    try {
      const geoStatus = await new Promise<any>((resolve, reject) => {
        exec('bash ./scripts/geo-replication.sh --status', (error, stdout, stderr) => {
          if (error) {
            metrics.replicationStatus = 'disabled';
            return resolve({ enabled: false });
          }
          resolve({ raw: stdout, enabled: stdout.includes('Replication Enabled: true') });
        });
      });
      
      if (geoStatus.enabled) {
        metrics.replicationStatus = 'enabled';
        
        // Check for problems in replication
        if (geoStatus.raw.includes('Status: Disconnected')) {
          metrics.replicationStatus = 'warning';
          metrics.healthStatus = 'warning';
        }
      }
    } catch (error) {
      metrics.replicationStatus = 'error';
      metrics.healthStatus = 'warning';
    }

    // Set overall health status
    if (metrics.verificationStatus === 'failed') {
      metrics.healthStatus = 'critical';
    } else if (metrics.lastBackupTime && new Date().getTime() - new Date(metrics.lastBackupTime as string).getTime() > 86400000) {
      // If no backup in last 24 hours
      metrics.healthStatus = 'warning';
    }

    // Return the metrics in a monitoring-friendly format
    res.json({
      success: true,
      metrics
    });
    
  } catch (error) {
    console.error('Error getting backup monitoring metrics:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get backup monitoring metrics',
      error: (error as Error).message 
    });
  }
});

// Helper function to format bytes into human-readable format
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}