const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createTestUser() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('Test1234!', 10);
    
    // Check if user exists
    const checkResult = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      ['test1234']
    );
    
    if (checkResult.rows.length > 0) {
      console.log('Test user already exists, updating password...');
      
      // Update the password
      await pool.query(
        'UPDATE users SET password = $1 WHERE username = $2',
        [hashedPassword, 'test1234']
      );
      
      console.log('Password updated successfully for user test1234');
      return;
    }
    
    // Create a new user
    await pool.query(
      `INSERT INTO users 
       (username, password, email, full_name, created_at, is_admin, is_employee, user_group, language_preference, email_verified)
       VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9)`,
      [
        'test1234', 
        hashedPassword, 
        'test@example.com', 
        'Test User',
        false, // is_admin
        false, // is_employee
        'client', // user_group
        'en', // language_preference
        true // email_verified
      ]
    );
    
    console.log('Test user created successfully');
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    pool.end();
  }
}

createTestUser();