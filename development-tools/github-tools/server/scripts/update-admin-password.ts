import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function hashPassword(password: string) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function updateAdminPassword() {
  try {
    console.log("Database connection successful");
    
    // Get username and password from command line arguments
    const username = process.argv[2] || "admin";
    const password = process.argv[3] || "admin123";
    
    // Update admin user password
    const hashedPassword = await hashPassword(password);
    
    const updatedUser = await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.username, username))
      .returning();
    
    if (updatedUser.length > 0) {
      console.log("Admin password updated successfully");
    } else {
      console.log(`User '${username}' not found`);
    }
  } catch (error) {
    console.error("Failed to update admin password:", error);
  }
}

updateAdminPassword().catch(console.error);