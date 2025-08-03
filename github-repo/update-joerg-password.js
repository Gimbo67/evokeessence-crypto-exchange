/**
 * This script updates the password for the user "Joerg"
 */

import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Pool } = pkg;

// Connect to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateJoergPassword() {
  // Connect to the database
  const client = await pool.connect();
  
  try {
    // Find the user
    const userResult = await client.query(
      'SELECT * FROM users WHERE username = $1',
      ['Joerg '] // Note: There's a space after "Joerg"
    );
    
    if (userResult.rows.length === 0) {
      console.error('User not found: Joerg');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`Found user with ID: ${user.id}`);
    
    // Generate a new hashed password
    const password = '12345678';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Update the password for the user
    const result = await client.query(
      'UPDATE users SET password = $1, updated_at = $2 WHERE id = $3 RETURNING id, username',
      [hashedPassword, new Date(), user.id]
    );
    
    if (result.rows.length > 0) {
      console.log(`Updated password for user ${result.rows[0].username} (ID: ${result.rows[0].id})`);
      console.log(`New password: ${password}`);
    } else {
      console.log('Password update failed');
    }
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    client.release();
  }
}

// Run the update
updateJoergPassword()
  .then(() => console.log('Password update complete'))
  .catch(console.error)
  .finally(() => process.exit(0));