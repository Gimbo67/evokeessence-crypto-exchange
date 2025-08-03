/**
 * This script updates the username for the user "Joerg "
 */

import pkg from 'pg';
const { Pool } = pkg;

// Connect to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateJoergUsername() {
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
    
    // Check if 'joerg' username already exists
    const existingUserCheck = await client.query(
      'SELECT * FROM users WHERE username = $1',
      ['joerg']
    );
    
    if (existingUserCheck.rows.length > 0) {
      console.error('Cannot update username: "joerg" already exists');
      return;
    }
    
    // Update the username for the user
    const result = await client.query(
      'UPDATE users SET username = $1, updated_at = $2 WHERE id = $3 RETURNING id, username',
      ['joerg', new Date(), user.id]
    );
    
    if (result.rows.length > 0) {
      console.log(`Updated username for user ID ${result.rows[0].id} from "Joerg " to "${result.rows[0].username}"`);
    } else {
      console.log('Username update failed');
    }
  } catch (error) {
    console.error('Error updating username:', error);
  } finally {
    client.release();
  }
}

// Run the update
updateJoergUsername()
  .then(() => console.log('Username update complete'))
  .catch(console.error)
  .finally(() => process.exit(0));