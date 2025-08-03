
import { db } from "@db";
import { users } from "@db/schema";
import bcrypt from "bcrypt";

async function hashPassword(password: string) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function createAdminUsers() {
  const adminUsers = [
    { username: 'admin', password: 'adminpassword', userGroup: 'second_admin', email: 'admin@example.com', fullName: 'Admin User' },
    { username: 'jakob11', password: 'qdU-Han3-12.', userGroup: 'second_admin' },
    { username: 'duylam', password: 'qdU-Lam3-12.', userGroup: 'second_admin' },
    { username: 'genschi', password: 'qdU-Sv3n-12.', userGroup: 'second_admin' },
    { username: 'modouzi', password: 'qdU-Mo3-12.', userGroup: 'second_admin' }
  ];

  for (const userData of adminUsers) {
    const hashedPassword = await hashPassword(userData.password);
    
    try {
      const [user] = await db
        .insert(users)
        .values({
          username: userData.username,
          password: hashedPassword,
          isAdmin: true,
          userGroup: userData.userGroup,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      console.log(`Created admin user: ${userData.username}`);
    } catch (error) {
      console.error(`Failed to create user ${userData.username}:`, error);
    }
  }
}

createAdminUsers().catch(console.error);
