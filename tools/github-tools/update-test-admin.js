/**
 * This script updates the admin password for testing
 */

import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Pool } = pkg;

// Connect to database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateAdminPassword() {
  // Connect to the database
  const client = await pool.connect();
  
  try {
    // Generate a new hashed password
    const password = 'Adm1nU2017';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Update the password for the admin user
    const result = await client.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username',
      [hashedPassword, 'admin']
    );
    
    if (result.rows.length > 0) {
      console.log(`Updated password for admin user ${result.rows[0].username} (ID: ${result.rows[0].id})`);
      console.log('New password: Adm1nU2017');
    } else {
      console.log('Admin user not found');
    }
  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    client.release();
  }
}

// Run the update
updateAdminPassword()
  .then(() => console.log('Password update complete'))
  .catch(console.error)
  .finally(() => process.exit(0));