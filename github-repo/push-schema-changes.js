/**
 * This script applies the schema changes to the database
 * It adds the required fields for push notifications to the user_sessions table
 */

const { db } = require('./db');
const { sql } = require('drizzle-orm');

async function addColumnsIfNeeded() {
  console.log('Checking user_sessions table structure...');
  
  try {
    // Check if the columns already exist
    const columns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_sessions' 
      AND (column_name = 'device_id' OR column_name = 'device_os' OR column_name = 'push_token' OR column_name = 'notifications_enabled')
    `);
    
    const existingColumns = columns.rows.map(row => row.column_name);
    console.log('Existing push notification related columns:', existingColumns);
    
    // Add device_id column if it doesn't exist
    if (!existingColumns.includes('device_id')) {
      console.log('Adding device_id column to user_sessions table...');
      await db.execute(sql`
        ALTER TABLE user_sessions 
        ADD COLUMN device_id VARCHAR(255)
      `);
      console.log('device_id column added successfully');
    }
    
    // Add device_os column if it doesn't exist
    if (!existingColumns.includes('device_os')) {
      console.log('Adding device_os column to user_sessions table...');
      await db.execute(sql`
        ALTER TABLE user_sessions 
        ADD COLUMN device_os VARCHAR(20)
      `);
      console.log('device_os column added successfully');
    }
    
    // Add push_token column if it doesn't exist
    if (!existingColumns.includes('push_token')) {
      console.log('Adding push_token column to user_sessions table...');
      await db.execute(sql`
        ALTER TABLE user_sessions 
        ADD COLUMN push_token TEXT
      `);
      console.log('push_token column added successfully');
    }
    
    // Add notifications_enabled column if it doesn't exist
    if (!existingColumns.includes('notifications_enabled')) {
      console.log('Adding notifications_enabled column to user_sessions table...');
      await db.execute(sql`
        ALTER TABLE user_sessions 
        ADD COLUMN notifications_enabled BOOLEAN DEFAULT TRUE
      `);
      console.log('notifications_enabled column added successfully');
    }
    
    console.log('All schema changes applied successfully!');
  } catch (error) {
    console.error('Error updating schema:', error);
    throw error;
  }
}

async function main() {
  try {
    await addColumnsIfNeeded();
    process.exit(0);
  } catch (error) {
    console.error('Failed to apply schema changes:', error);
    process.exit(1);
  }
}

main();