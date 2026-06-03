import { Router } from "express";
import { Pool } from "pg";

const router = Router();
const getPool = () => new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

router.get("/public", async (_req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query("SELECT maintenance_mode, maintenance_message FROM store_settings LIMIT 1");
    res.json({
      maintenanceMode: rows[0]?.maintenance_mode || false,
      maintenanceMessage: rows[0]?.maintenance_message || "We are performing scheduled maintenance. Please check back soon."
    });
  } catch {
    res.json({ maintenanceMode: false, maintenanceMessage: "" });
  } finally { pool.end(); }
});

router.put("/maintenance", async (req, res) => {
  const pool = getPool();
  try {
    const { enabled, message } = req.body;
    await pool.query(
      "UPDATE store_settings SET maintenance_mode = $1, maintenance_message = $2 WHERE id = (SELECT id FROM store_settings LIMIT 1)",
      [enabled, message || "We are performing scheduled maintenance. Please check back soon."]
    );
    res.json({ success: true, maintenanceMode: enabled });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally { pool.end(); }
});

export default router;