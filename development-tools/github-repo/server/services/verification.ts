import { db } from "@db";
import { verificationCodes, users } from "@db/schema";
import { and, eq, gt } from "drizzle-orm";
import { createAndSendVerificationCode as sendCode } from "./email";

// Generate a random 6-digit code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create and send a verification code
export async function createAndSendVerificationCode(userId: number, email: string, type: 'email_verification' | 'password_reset'): Promise<string> {
  const code = generateVerificationCode();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Valid for 15 minutes

  await db.insert(verificationCodes).values({
    userId,
    code,
    type,
    expiresAt,
    createdAt: new Date(),
  });

  await sendCode(userId, email, type);

  return code;
}

// Verify a code
export async function verifyCode(userId: number, code: string, type: 'email_verification' | 'password_reset'): Promise<boolean> {
  const now = new Date();

  const verificationCode = await db.query.verificationCodes.findFirst({
    where: and(
      eq(verificationCodes.userId, userId),
      eq(verificationCodes.code, code),
      eq(verificationCodes.type, type),
      eq(verificationCodes.used, false),
      gt(verificationCodes.expiresAt, now)
    ),
  });

  if (!verificationCode) {
    return false;
  }

  await db
    .update(verificationCodes)
    .set({ used: true })
    .where(eq(verificationCodes.id, verificationCode.id));

  if (type === 'email_verification') {
    await db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  return true;
}