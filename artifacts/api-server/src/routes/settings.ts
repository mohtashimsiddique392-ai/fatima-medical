import { Router } from "express";
import { pool } from "@workspace/db";
import { requirePermission } from "../middleware/adminAuth";

const router = Router();

router.get("/public", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT maintenance_mode, maintenance_message FROM store_settings LIMIT 1");
    res.json({
      maintenanceMode: rows[0]?.maintenance_mode || false,
      maintenanceMessage: rows[0]?.maintenance_message || "We are performing scheduled maintenance. Please check back soon.",
    });
  } catch {
    res.json({ maintenanceMode: false, maintenanceMessage: "" });
  }
});

router.put("/maintenance", requirePermission("dashboard"), async (req, res) => {
  try {
    const { enabled, message } = req.body;
    await pool.query(
      "UPDATE store_settings SET maintenance_mode = $1, maintenance_message = $2 WHERE id = (SELECT id FROM store_settings LIMIT 1)",
      [enabled, message || "We are performing scheduled maintenance. Please check back soon."]
    );
    res.json({ success: true, maintenanceMode: enabled });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
