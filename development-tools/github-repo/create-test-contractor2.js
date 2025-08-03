import bcrypt from 'bcrypt';
import pg from 'pg';
const { Client } = pg;

async function createTestContractor() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    // Hash the password
    const password = 'Test1234!';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user already exists
    const checkResult = await client.query(
      'SELECT * FROM users WHERE username = $1',
      ['testcontractor2']
    );
    
    if (checkResult.rows.length > 0) {
      console.log('User testcontractor2 already exists');
      return;
    }
    
    // Insert new contractor
    const result = await client.query(
      'INSERT INTO users (username, password, email, is_admin, is_employee, is_contractor, referral_code, contractor_commission_rate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [
        'testcontractor2', // username
        hashedPassword, // password
        'testcontractor2@example.com', // email
        false, // is_admin
        false, // is_employee
        true, // is_contractor
        'TEST2', // referral_code
        0.85 // contractor_commission_rate
      ]
    );
    
    console.log('Created contractor with ID:', result.rows[0].id);
  } catch (error) {
    console.error('Error creating contractor:', error);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

createTestContractor();