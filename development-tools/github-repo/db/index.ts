import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection
const client = postgres(process.env.DATABASE_URL, {
  max: 1,
  ssl: 'require',
  connect_timeout: 10
});

export const db = drizzle(client, { schema });

// Test database connection
(async () => {
  try {
    const result = await client`SELECT 1`;
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
})();