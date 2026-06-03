import { Router } from "express";
import { Pool } from "pg";

const router = Router();
const getPool = () => new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

router.post("/run", async (_req, res) => {
  const pool = getPool();
  try {
    await pool.query(`
      ALTER TABLE store_settings
        ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS maintenance_message TEXT DEFAULT 'We are under maintenance. Please check back soon.';
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS medicine_cache (
        id SERIAL PRIMARY KEY,
        name_key TEXT UNIQUE NOT NULL,
        category TEXT,
        image_url TEXT,
        salt_name TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    res.json({ success: true, message: "Migration complete" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { pool.end(); }
});

export default router;