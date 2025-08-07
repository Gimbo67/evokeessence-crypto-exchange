import bcrypt from 'bcrypt';
import pg from 'pg';
const { Client } = pg;

async function createReferredUser() {
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
      ['referreduser2']
    );
    
    if (checkResult.rows.length > 0) {
      console.log('User referreduser2 already exists');
      return;
    }
    
    // Insert new user with referral code
    const result = await client.query(
      'INSERT INTO users (username, password, email, is_admin, is_employee, is_contractor, referred_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [
        'referreduser2', // username
        hashedPassword, // password
        'referreduser2@example.com', // email
        false, // is_admin
        false, // is_employee
        false, // is_contractor
        'TEST2' // referred_by (contractor's referral code)
      ]
    );
    
    const userId = result.rows[0].id;
    console.log('Created referred user with ID:', userId);
    
    // Create a deposit for this user with contractor commission
    await client.query(
      `INSERT INTO sepa_deposits (
        user_id, 
        amount, 
        status, 
        currency, 
        reference, 
        commission_fee, 
        referral_code, 
        contractor_id, 
        contractor_commission
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId, // user_id
        '1000.00', // amount
        'completed', // status
        'EUR', // currency
        'REF-' + Date.now(), // reference
        '100.00', // commission_fee (10%)
        'TEST2', // referral_code
        102, // contractor_id
        '8.50' // contractor_commission (0.85%)
      ]
    );
    
    console.log('Created deposit for user');
  } catch (error) {
    console.error('Error creating referred user:', error);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

createReferredUser();