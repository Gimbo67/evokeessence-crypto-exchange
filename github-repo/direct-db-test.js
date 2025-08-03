// ES Module script to directly test database operations for employees
import postgres from 'postgres';
import bcrypt from 'bcrypt';

// Create a simple PostgreSQL client
const sql = postgres(process.env.DATABASE_URL);

// Function to create a test employee
async function createTestEmployee() {
  try {
    console.log('Starting direct database test for employee creation...');
    
    // Random username to avoid conflicts
    const username = 'testemployee' + Math.floor(Math.random() * 1000);
    const email = username + '@example.com';
    const password = 'password123';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user exists first
    const existingUsers = await sql`
      SELECT * FROM users WHERE username = ${username} OR email = ${email}
    `;
    
    if (existingUsers.length > 0) {
      console.log('User already exists:', existingUsers[0]);
      return;
    }
    
    // Insert new user
    console.log('Creating new employee user...');
    const newUser = await sql`
      INSERT INTO users (
        username, 
        email, 
        password, 
        full_name, 
        is_employee, 
        is_admin, 
        user_group, 
        kyc_status
      ) 
      VALUES (
        ${username}, 
        ${email}, 
        ${hashedPassword}, 
        'Test Employee',
        true,
        false, 
        'kyc_employee',
        'verified'
      )
      RETURNING *
    `;
    
    if (newUser.length === 0) {
      console.error('Failed to create employee');
      return;
    }
    
    console.log('Created new employee:', newUser[0]);
    
    // Create permissions
    const userId = newUser[0].id;
    const permissions = [
      'view_transactions',
      'view_clients', 
      'view_client_details',
      'change_kyc_status'
    ];
    
    console.log(`Adding permissions for user ID ${userId}...`);
    
    // Add each permission
    for (const permissionType of permissions) {
      const result = await sql`
        INSERT INTO user_permissions (
          user_id,
          permission_type,
          granted
        )
        VALUES (
          ${userId},
          ${permissionType},
          true
        )
        RETURNING *
      `;
      
      console.log(`Added permission '${permissionType}':`, result[0]);
    }
    
    // Verify permissions were created
    const userPermissions = await sql`
      SELECT * FROM user_permissions WHERE user_id = ${userId}
    `;
    
    console.log(`Retrieved ${userPermissions.length} permissions for user ID ${userId}:`, userPermissions);
    
    // Update some permissions to test update functionality
    console.log('\nUpdating permissions...');
    
    // Delete 'view_clients' permission
    await sql`
      DELETE FROM user_permissions 
      WHERE user_id = ${userId} AND permission_type = 'view_clients'
    `;
    
    // Add a new permission
    await sql`
      INSERT INTO user_permissions (user_id, permission_type, granted)
      VALUES (${userId}, 'edit_transactions', true)
      RETURNING *
    `;
    
    // Check updated permissions
    const updatedPermissions = await sql`
      SELECT * FROM user_permissions WHERE user_id = ${userId}
    `;
    
    console.log('Updated permissions:', updatedPermissions);
    
    return {
      userId,
      username,
      email
    };
  } catch (error) {
    console.error('Error in direct database test:', error);
  } finally {
    // Close the database connection
    await sql.end();
  }
}

// Run the test
createTestEmployee()
  .then(result => {
    if (result) {
      console.log('\nTest completed successfully!');
      console.log('Created employee:', result);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });