import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "@workspace/db";
import { requirePermission, requireAdmin, signAdminToken } from "../middleware/adminAuth";

const router = Router();

// ── Store Settings ──────────────────────────────────────────────
router.get("/settings", requirePermission("dashboard"), async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM store_settings LIMIT 1");
  res.json(rows[0] || {});
});

router.put("/settings", requirePermission("dashboard"), async (req, res) => {
  const { store_name, address, phone, gstin, gst_enabled, cgst_rate, sgst_rate } = req.body;
  const { rows } = await pool.query(`
    UPDATE store_settings SET
      store_name = COALESCE($1, store_name),
      address = COALESCE($2, address),
      phone = COALESCE($3, phone),
      gstin = $4,
      gst_enabled = COALESCE($5, gst_enabled),
      cgst_rate = COALESCE($6, cgst_rate),
      sgst_rate = COALESCE($7, sgst_rate)
    WHERE id = (SELECT id FROM store_settings LIMIT 1)
    RETURNING *
  `, [store_name, address, phone, gstin, gst_enabled, cgst_rate, sgst_rate]);
  res.json(rows[0]);
});

// ── Sub-Admins (admin only — not manageable by sub-admins themselves) ──
router.get("/sub-admins", requireAdmin, async (req, res) => {
  if (req.admin!.role !== "admin") return res.status(403).json({ error: "Admin only" });
  const { rows } = await pool.query("SELECT id, username, name, phone, permissions, is_active, created_at FROM sub_admins ORDER BY created_at DESC");
  res.json({ subAdmins: rows });
});

router.post("/sub-admins", requireAdmin, async (req, res) => {
  if (req.admin!.role !== "admin") return res.status(403).json({ error: "Admin only" });
  try {
    const { username, password, name, phone, permissions } = req.body;
    if (!username || !password || !name) return res.status(400).json({ error: "Username, password and name required" });
    const hashed = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO sub_admins (username, password, name, phone, permissions) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, name, phone, permissions, is_active",
      [username, hashed, name, phone, JSON.stringify(permissions || { catalogue: true, orders: true, billing: true, customers: false, dashboard: false })]
    );
    return res.status(201).json(rows[0]);
  } catch (e: any) {
    if (e.code === "23505") return res.status(400).json({ error: "Username already exists" });
    return res.status(500).json({ error: e.message });
  }
});

router.put("/sub-admins/:id", requireAdmin, async (req, res) => {
  if (req.admin!.role !== "admin") return res.status(403).json({ error: "Admin only" });
  try {
    const { name, phone, permissions, is_active, password } = req.body;
    const id = Number(req.params.id);
    const isActive = is_active !== undefined ? is_active : true;
    const permsJson = JSON.stringify(permissions || {});

    let rows;
    if (password && password.trim()) {
      const hashed = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `UPDATE sub_admins SET name=$1, phone=$2, permissions=$3, is_active=$4, password=$5 WHERE id=$6 RETURNING id, username, name, phone, permissions, is_active`,
        [name, phone || null, permsJson, isActive, hashed, id]
      );
      rows = result.rows;
    } else {
      const result = await pool.query(
        `UPDATE sub_admins SET name=$1, phone=$2, permissions=$3, is_active=$4 WHERE id=$5 RETURNING id, username, name, phone, permissions, is_active`,
        [name, phone || null, permsJson, isActive, id]
      );
      rows = result.rows;
    }

    if (!rows[0]) return res.status(404).json({ error: "Sub-admin not found" });
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/sub-admins/:id", requireAdmin, async (req, res) => {
  if (req.admin!.role !== "admin") return res.status(403).json({ error: "Admin only" });
  await pool.query("UPDATE sub_admins SET is_active = false WHERE id = $1", [req.params.id]);
  res.json({ message: "Sub-admin deactivated" });
});

router.post("/sub-admins/login", async (req, res) => {
  const { username, password } = req.body;
  const { rows } = await pool.query("SELECT * FROM sub_admins WHERE username = $1 AND is_active = true", [username]);
  if (!rows[0]) return res.status(401).json({ error: "Invalid credentials" });
  const valid = await bcrypt.compare(password, rows[0].password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });
  const token = signAdminToken({ sub: rows[0].id, username: rows[0].username, role: "subadmin", permissions: rows[0].permissions });
  const { password: _pw, ...safe } = rows[0];
  return res.json({ ...safe, token, role: "subadmin" });
});

// ── Customer lookup (for in-store billing) ─────────────────────────
router.get("/customer-lookup", requirePermission("billing"), async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "Phone required" });
  const { rows } = await pool.query("SELECT id, name, phone FROM customers WHERE phone = $1 LIMIT 1", [phone]);
  if (!rows[0]) return res.status(404).json({ error: "Customer not found" });
  return res.json(rows[0]);
});

// ── Bills ────────────────────────────────────────────────────────
router.get("/bills", requirePermission("billing"), async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM bills ORDER BY created_at DESC LIMIT 50");
  res.json({ bills: rows });
});

router.get("/bills/:id", requirePermission("billing"), async (req, res) => {
  const { rows: [bill] } = await pool.query("SELECT * FROM bills WHERE id = $1", [req.params.id]);
  if (!bill) return res.status(404).json({ error: "Bill not found" });
  const { rows: items } = await pool.query("SELECT * FROM bill_items WHERE bill_id = $1", [bill.id]);
  const { rows: [settings] } = await pool.query("SELECT * FROM store_settings LIMIT 1");
  return res.json({ bill, items, settings });
});

router.post("/bills", requirePermission("billing"), async (req, res) => {
  try {
    const {
      customer_id, customer_name, customer_phone, customer_address,
      items, subtotal, discount, total_after_discount, gst_amount,
      final_total, payment_method, notes, created_by,
    } = req.body;

    if (!items?.length) return res.status(400).json({ error: "Items required" });

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    const dateStr = `${dd}${mm}${yyyy}`;
    const { rows: countRows } = await pool.query("SELECT COUNT(*) FROM bills WHERE bill_number LIKE $1", [`FM-${dateStr}-%`]);
    const seq = String(Number(countRows[0].count) + 1).padStart(3, "0");
    const bill_number = `FM-${dateStr}-${seq}`;

    const { rows: [bill] } = await pool.query(
      `INSERT INTO bills (bill_number, customer_id, customer_name, customer_phone, customer_address, subtotal, discount, total_after_discount, gst_amount, final_total, payment_method, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [bill_number, customer_id || null, customer_name || null, customer_phone || null, customer_address || null,
       subtotal, discount, total_after_discount, gst_amount || 0, final_total, payment_method || "cash", notes || null, created_by || null]
    );

    for (const item of items) {
      await pool.query(
        `INSERT INTO bill_items (bill_id, product_id, product_name, salt_name, manufacturer, batch_number, expiry_date, pack_type, quantity, mrp, gst_rate, amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [bill.id, item.product_id || null, item.product_name, item.salt_name || null,
         item.manufacturer || null, item.batch_number || null, item.expiry_date || null,
         item.pack_type || "strip", item.quantity, item.mrp, item.gst_rate || 0, item.amount]
      );
      if (item.product_id) {
        await pool.query("UPDATE products SET stock = GREATEST(stock - $1, 0) WHERE id = $2", [item.quantity, item.product_id]);
      }
    }

    if (customer_id) {
      const { rows: [order] } = await pool.query(
        `INSERT INTO orders (customer_id, total_amount, payment_method, payment_status, status, address, notes, credits_used)
         VALUES ($1,$2,$3,'paid','delivered',$4,$5,0) RETURNING *`,
        [customer_id, final_total, payment_method || "cash", customer_address || "In-Store Purchase", `In-Store Bill #${bill_number}`]
      );
      for (const item of items) {
        await pool.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
           VALUES ($1,$2,$3,$4,$5)`,
          [order.id, item.product_id || 0, item.product_name, item.quantity, item.mrp]
        );
      }
    }

    const { rows: [settings] } = await pool.query("SELECT * FROM store_settings LIMIT 1");
    const { rows: allItems } = await pool.query("SELECT * FROM bill_items WHERE bill_id = $1", [bill.id]);
    return res.status(201).json({ bill, items: allItems, settings });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
