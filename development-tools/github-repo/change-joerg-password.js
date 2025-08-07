/**
 * Script to update the password for user "Joerg"
 */
import bcrypt from 'bcrypt';
import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

async function updateJoergPassword() {
  try {
    console.log('Updating password for user: Joerg');
    
    // Find the user
    const existingUser = await db.query.users.findFirst({
      where: eq(users.username, 'Joerg ')  // Note: There's a space after "Joerg"
    });
    
    if (!existingUser) {
      console.error('User not found: Joerg');
      process.exit(1);
    }
    
    console.log(`Found user with ID: ${existingUser.id}`);
    
    // Generate new password hash
    const saltRounds = 10;
    const newPassword = '12345678';
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update the user's password
    const updateResult = await db
      .update(users)
      .set({
        password: passwordHash,
        updated_at: new Date()
      })
      .where(eq(users.id, existingUser.id))
      .returning({ id: users.id, username: users.username });
    
    console.log(`Updated password for user:`, updateResult[0]);
    console.log('Password update successful!');
    
  } catch (error) {
    console.error('Error updating password:', error);
    process.exit(1);
  }
}

// Run the function
updateJoergPassword()
  .then(() => {
    console.log('Password update complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });