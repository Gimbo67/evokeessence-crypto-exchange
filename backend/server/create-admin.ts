import { db } from "@db";
import { users } from "@db/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function resetAdminPassword() {
  const adminPassword = "admin123"; // You can change this password
  const hashedPassword = await hashPassword(adminPassword);

  try {
    const [admin] = await db
      .update(users)
      .set({
        password: hashedPassword
      })
      .where(eq(users.username, "admin"))
      .returning();

    console.log("Admin password reset successfully");
    console.log("Username:", admin.username);
    console.log("New Password:", adminPassword);
  } catch (error) {
    console.error("Failed to reset admin password:", error);
  }
}

resetAdminPassword();