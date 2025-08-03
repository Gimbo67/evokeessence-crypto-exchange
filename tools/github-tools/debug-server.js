/**
 * Minimal script to debug server startup issues
 */

import pkg from 'pg';
import express from 'express';
import cors from 'cors';

const { Pool } = pkg;
const PORT = 5555; // Use a different port for testing

async function checkDatabaseConnection() {
  try {
    console.log('Checking database connection...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0]);
    
    // Check users table
    const usersResult = await pool.query('SELECT COUNT(*) FROM users');
    console.log('Users table row count:', usersResult.rows[0]);
    
    await pool.end();
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

async function startMinimalServer() {
  try {
    // Check database first
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      console.error('Cannot start server without database connection');
      process.exit(1);
    }
    
    // Create a simple express server
    const app = express();
    
    // Basic middleware
    app.use(cors());
    app.use(express.json());
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Minimal server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting minimal server:', error);
  }
}

// Run the debug server
startMinimalServer();