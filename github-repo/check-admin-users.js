/**
 * This script checks current admin users in the database
 */

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/pg-pool';
import { eq } from "drizzle-orm";

// Connect to the database using environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create schema inline for this script
const users = {
  id: { name: 'id' },
  username: { name: 'username' },
  isAdmin: { name: 'is_admin' },
  userGroup: { name: 'user_group' },
  createdAt: { name: 'created_at' }
};

const db = drizzle(pool);

async function checkAdminUsers() {
  console.log('Checking admin users in the database...');
  
  try {
    // Get all admin users
    const adminUsers = await db.query.users.findMany({
      where: eq(users.isAdmin, true),
      columns: {
        id: true,
        username: true,
        isAdmin: true,
        userGroup: true,
        createdAt: true
      }
    });
    
    console.log(`Found ${adminUsers.length} admin users:`);
    adminUsers.forEach(user => {
      console.log(JSON.stringify(user, null, 2));
    });
  } catch (error) {
    console.error('Error checking admin users:', error);
  }
}

// Run the query
checkAdminUsers()
  .then(() => console.log('Admin user check complete'))
  .catch(console.error)
  .finally(() => process.exit(0));