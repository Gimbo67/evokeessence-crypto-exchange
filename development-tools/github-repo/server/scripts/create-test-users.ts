import { db } from "../../db";
import { users } from "../../db/schema";
import bcrypt from "bcrypt";

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function createTestUsers() {
  try {
    console.log("Starting to create test users...");
    
    // Check if test user exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, "test@example.com")
    });
    
    if (existingUser) {
      console.log("Test user already exists, skipping creation.");
      return;
    }
    
    // Create test user
    const hashedPassword = await hashPassword("password123");
    
    await db.insert(users).values({
      username: "testuser",
      email: "test@example.com",
      password: hashedPassword,
      fullName: "Test User",
      isAdmin: false,
      isEmployee: false,
      kycStatus: "pending",
      emailVerified: true,
      twoFactorEnabled: false,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    });
    
    console.log("Test user created successfully.");
  } catch (error) {
    console.error("Error creating test users:", error);
  }
}

// Run the function
createTestUsers()
  .then(() => {
    console.log("Script completed.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
  });