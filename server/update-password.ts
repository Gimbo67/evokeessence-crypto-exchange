
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function updatePassword() {
  const hashedPassword = await hashPassword('12345678');
  
  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.username, 'duyadmintest'));

  console.log('Password updated successfully');
  process.exit(0);
}

updatePassword().catch(console.error);
