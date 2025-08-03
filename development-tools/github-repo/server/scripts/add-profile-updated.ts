
import { db } from "@db";
import { sql } from "drizzle-orm";

async function addProfileUpdatedColumn() {
  try {
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS profile_updated BOOLEAN DEFAULT FALSE;
    `);
    console.log("Successfully added profile_updated column");
  } catch (error) {
    console.error("Error adding profile_updated column:", error);
  }
  process.exit(0);
}

addProfileUpdatedColumn();
