import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import archiver from 'archiver';
import { requireAuthentication, requireAdminAccess } from '../middleware/auth.js';

const router = Router();

// Files and directories to exclude from export
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'logs',
  '*.log',
  '.env*',
  '*.sqlite*',
  '*.pem',
  '*.key',
  '*.crt',
  'certain-mission-*.json',
  'client_secret_*.json',
  'admin_cookie.txt',
  'admin_cookies.txt',
  'admin_session.txt',
  'abuse.log',
  'attached_assets',
  '.DS_Store',
  'Thumbs.db',
  '.idea',
  '.vscode',
  '*.swp',
  '*.swo',
  'tmp',
  '.tmp',
  'temp'
];

// Helper function to check if path should be excluded
function shouldExclude(filePath: string): boolean {
  const fileName = path.basename(filePath);
  const relativePath = path.relative(process.cwd(), filePath);
  
  return EXCLUDE_PATTERNS.some(pattern => {
    if (pattern.includes('*')) {
      // Handle wildcard patterns
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(fileName) || regex.test(relativePath);
    } else {
      // Handle exact matches and directory names
      return fileName === pattern || 
             relativePath.includes(pattern) || 
             relativePath.startsWith(pattern + '/');
    }
  });
}

// Recursively get all files to include in export
async function getFilesToExport(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (shouldExclude(fullPath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        const subFiles = await getFilesToExport(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

// Export project as ZIP file (full project download)
router.get('/full-project.zip', async (req, res) => {
  try {
    const projectRoot = process.cwd();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `evokeessence-full-project.zip`;
    
    // Set response headers
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache'
    });
    
    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create archive' });
      }
    });
    
    // Pipe archive to response
    archive.pipe(res);
    
    // Get all files to include
    const filesToExport = await getFilesToExport(projectRoot);
    
    console.log(`Exporting ${filesToExport.length} files...`);
    
    // Add files to archive
    for (const filePath of filesToExport) {
      try {
        const relativePath = path.relative(projectRoot, filePath);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          archive.file(filePath, { name: relativePath });
        }
      } catch (error) {
        console.error(`Error adding file ${filePath}:`, error);
      }
    }
    
    // Add project information file
    const projectInfo = {
      name: 'EvokeEssence Cryptocurrency Exchange Platform',
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      description: 'Complete project export including source code, configuration, and documentation',
      excludedItems: EXCLUDE_PATTERNS,
      totalFiles: filesToExport.length,
      setupInstructions: [
        '1. Extract all files to your desired directory',
        '2. Run "npm install" to install dependencies',
        '3. Copy .env.example to .env and configure your environment variables',
        '4. Run "npm run db:push" to set up the database schema',
        '5. Run "npm run dev" to start the development server'
      ]
    };
    
    archive.append(JSON.stringify(projectInfo, null, 2), { name: 'PROJECT_INFO.json' });
    
    // Finalize the archive
    await archive.finalize();
    
  } catch (error) {
    console.error('Export error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to export project' });
    }
  }
});

// Test endpoint to show export info without authentication (for demo purposes)  
router.get('/test-info', async (req, res) => {
  try {
    const projectRoot = process.cwd();
    const filesToExport = await getFilesToExport(projectRoot);
    
    let totalSize = 0;
    const fileTypes: { [key: string]: number } = {};
    
    for (const filePath of filesToExport.slice(0, 100)) { // Limit to first 100 files for quick response
      try {
        const stats = await fs.stat(filePath);
        const ext = path.extname(filePath).toLowerCase() || 'no-extension';
        
        totalSize += stats.size;
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
      } catch (error) {
        // Skip files that can't be accessed
      }
    }
    
    res.json({
      success: true,
      projectName: 'EvokeEssence Cryptocurrency Exchange Platform',
      totalFiles: filesToExport.length,
      estimatedSize: `${(totalSize / 1024 / 1024).toFixed(2)} MB`,
      fileTypes,
      excludedPatterns: EXCLUDE_PATTERNS,
      sampleFiles: filesToExport.slice(0, 10),
      note: 'This is a test endpoint. Use /api/export/download with admin authentication for actual download.'
    });
    
  } catch (error) {
    console.error('Export info error:', error);
    res.status(500).json({ error: 'Failed to get export information' });
  }
});

// Get export information (file count, size estimate, etc.)
router.get('/info', requireAuthentication, requireAdminAccess, async (req, res) => {
  try {
    const projectRoot = process.cwd();
    const filesToExport = await getFilesToExport(projectRoot);
    
    let totalSize = 0;
    const fileTypes: { [key: string]: number } = {};
    
    for (const filePath of filesToExport) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
          
          const ext = path.extname(filePath).toLowerCase() || 'no-extension';
          fileTypes[ext] = (fileTypes[ext] || 0) + 1;
        }
      } catch (error) {
        // Skip files that can't be accessed
      }
    }
    
    res.json({
      totalFiles: filesToExport.length,
      estimatedSize: totalSize,
      estimatedSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      fileTypes,
      excludedPatterns: EXCLUDE_PATTERNS,
      lastUpdated: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Export info error:', error);
    res.status(500).json({ error: 'Failed to get export information' });
  }
});

export default router;