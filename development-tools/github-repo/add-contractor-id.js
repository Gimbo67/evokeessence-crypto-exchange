/**
 * Direct migration script to add the contractor_id field to users table
 */
import pkg from 'pg';
const { Pool } = pkg;

async function runMigration() {
  try {
    // Connect to the database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Check if the column already exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='contractor_id'
    `;
    
    const checkResult = await pool.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('The contractor_id column already exists in the users table');
    } else {
      // Add the contractor_id column
      const addColumnQuery = `
        ALTER TABLE users 
        ADD COLUMN contractor_id INTEGER 
        REFERENCES users(id)
      `;
      
      await pool.query(addColumnQuery);
      console.log('Successfully added contractor_id column to users table');
    }

    // Close the connection
    await pool.end();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error running migration:', error);
  }
}

// Run the migration
runMigration();