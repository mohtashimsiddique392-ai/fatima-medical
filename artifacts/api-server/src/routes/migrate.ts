import { Router } from "express";
import { Pool } from "pg";

const router = Router();
const getPool = () => new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

router.post("/run", async (_req, res) => {
  const pool = getPool();
  const results: string[] = [];
  try {
    await pool.query(`
      ALTER TABLE store_settings
        ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS maintenance_message TEXT DEFAULT 'We are under maintenance. Please check back soon.';
    `);
    results.push("✓ maintenance_mode columns added");

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
    results.push("✓ medicine_cache table created");

    const fixDDMMYYYY = await pool.query(`
      UPDATE products
      SET expiry_date = TO_DATE(expiry_date::text, 'DD/MM/YYYY')
      WHERE expiry_date::text ~ '^\\d{2}/\\d{2}/\\d{4}$';
    `);
    results.push(`✓ Fixed ${fixDDMMYYYY.rowCount} DD/MM/YYYY expiry dates`);

    const fixDDMMYYYYDash = await pool.query(`
      UPDATE products
      SET expiry_date = TO_DATE(expiry_date::text, 'DD-MM-YYYY')
      WHERE expiry_date::text ~ '^\\d{2}-\\d{2}-\\d{4}$';
    `);
    results.push(`✓ Fixed ${fixDDMMYYYYDash.rowCount} DD-MM-YYYY expiry dates`);

    const fixMMYYYY = await pool.query(`
      UPDATE products
      SET expiry_date = TO_DATE(expiry_date::text || '-01', 'MM/YYYY-DD')
      WHERE expiry_date::text ~ '^\\d{2}/\\d{4}$';
    `);
    results.push(`✓ Fixed ${fixMMYYYY.rowCount} MM/YYYY expiry dates`);

    await pool.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2);
    `);
    results.push("✓ cost_price column ensured");

    res.json({ success: true, results });
  } catch (e: any) {
    res.status(500).json({ error: e.message, results });
  } finally { pool.end(); }
});

export default router;