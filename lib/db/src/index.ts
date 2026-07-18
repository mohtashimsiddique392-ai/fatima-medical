import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Use the Supabase 'Transaction pooler' connection string (port 6543) for serverless deployments (Vercel).",
  );
}

// A small max pool size is important on serverless (Vercel): each function
// invocation can spin up its own pool, and Supabase's pooler already
// multiplexes connections for you. Keep this low to avoid exhausting the
// pooler's connection slots under concurrent invocations.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
