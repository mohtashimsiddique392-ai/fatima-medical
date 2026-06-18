import { Router } from "express";
import { Pool } from "pg";
import { db } from "@workspace/db";
import { orderItemsTable, productsTable, customersTable, ordersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();
const getPool = () => new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

router.get("/", async (req, res) => {
  const pool = getPool();
  try {
    const { customerId, status } = req.query as { customerId?: string; status?: string };
    let query = "SELECT * FROM orders WHERE 1=1";
    const params: any[] = [];
    if (customerId) { params.push(Number(customerId)); query += ` AND customer_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND status = $${params.length}`; }
    query += " ORDER BY created_at DESC";
    const { rows: orders } = await pool.query(query, params);

    const result = await Promise.all(orders.map(async (order: any) => {
      const { rows: items } = await pool.query("SELECT * FROM order_items WHERE order_id = $1", [order.id]);
      let customerName = null, customerPhone = null;
      if (order.customer_id) {
        const { rows: [cust] } = await pool.query("SELECT name, phone FROM customers WHERE id = $1 LIMIT 1", [order.customer_id]);
        customerName = cust?.name; customerPhone = cust?.phone;
      }
      return { ...order, id: order.id, totalAmount: order.total_amount, paymentMethod: order.payment_method, paymentStatus: order.payment_status, createdAt: order.created_at, items, customerName, customerPhone };
    }));

    res.json({ orders: result, total: result.length });
  } finally { pool.end(); }
});

router.get("/:id", async (req, res) => {
  const pool = getPool();
  try {
    const { rows } = await pool.query("SELECT * FROM orders WHERE id = $1 LIMIT 1", [Number(req.params.id)]);
    if (!rows[0]) return res.status(404).json({ error: "Order not found" });
    const order = rows[0];
    const { rows: items } = await pool.query("SELECT * FROM order_items WHERE order_id = $1", [order.id]);
    let customerName = null, customerPhone = null;
    if (order.customer_id) {
      const { rows: [cust] } = await pool.query("SELECT name, phone FROM customers WHERE id = $1 LIMIT 1", [order.customer_id]);
      customerName = cust?.name; customerPhone = cust?.phone;
    }
    return res.json({ ...order, items, customerName, customerPhone });
  } finally { pool.end(); }
});

router.post("/", async (req, res) => {
  const pool = getPool();
  try {
    const { customerId, items, paymentMethod, address, notes, useReferralCredits } = req.body;
    if (!items?.length || !paymentMethod || !address) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let customer: any = null;
    if (customerId) {
      const { rows } = await pool.query("SELECT * FROM customers WHERE id = $1 LIMIT 1", [customerId]);
      customer = rows[0] || null;
    }

    let total = 0;
    const enrichedItems: any[] = [];

    for (const item of items) {
      const { rows } = await pool.query("SELECT * FROM products WHERE id = $1 LIMIT 1", [item.productId]);
      const product = rows[0];
      if (!product) return res.status(404).json({ error: `Product ${item.productId} not found` });
      if (product.stock < item.quantity) return res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
      total += Number(product.price) * item.quantity;
      enrichedItems.push({ productId: product.id, productName: product.name, quantity: item.quantity, price: Number(product.price) });
    }

    let creditsUsed = 0;
    if (customer && useReferralCredits && Number(customer.referral_credits) > 0) {
      creditsUsed = Math.min(Number(customer.referral_credits), total * 0.1);
      total -= creditsUsed;
    }

    const { rows: [order] } = await pool.query(
      `INSERT INTO orders (customer_id, total_amount, payment_method, payment_status, status, address, notes, credits_used)
       VALUES ($1,$2,$3,'pending','pending',$4,$5,$6) RETURNING *`,
      [customerId || null, total, paymentMethod, address, notes || null, creditsUsed]
    );

    for (const item of enrichedItems) {
      await pool.query(
        "INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES ($1,$2,$3,$4,$5)",
        [order.id, item.productId, item.productName, item.quantity, item.price]
      );
      await pool.query("UPDATE products SET stock = stock - $1 WHERE id = $2", [item.quantity, item.productId]);
    }

    if (customer && creditsUsed > 0) {
      await pool.query("UPDATE customers SET referral_credits = referral_credits - $1 WHERE id = $2", [creditsUsed, customerId]);
    }

    const { rows: items2 } = await pool.query("SELECT * FROM order_items WHERE order_id = $1", [order.id]);
    return res.status(201).json({ ...order, items: items2, customerName: customer?.name, customerPhone: customer?.phone });
  } finally { pool.end(); }
});

router.put("/:id/status", async (req, res) => {
  const pool = getPool();
  try {
    const { status, paymentStatus } = req.body;
    const id = Number(req.params.id);

    const { rows: [existing] } = await pool.query("SELECT * FROM orders WHERE id = $1 LIMIT 1", [id]);
    if (!existing) return res.status(404).json({ error: "Order not found" });

    const ORDER = ["pending", "confirmed", "processing", "shipped", "delivered"];
    if (status && status !== "cancelled") {
      const currentIdx = ORDER.indexOf(existing.status);
      const newIdx = ORDER.indexOf(status);
      if (newIdx < currentIdx) {
        return res.status(400).json({ error: `Cannot change status from ${existing.status} back to ${status}` });
      }
    }
    if (existing.status === "delivered" || existing.status === "cancelled") {
      return res.status(400).json({ error: `Order is already ${existing.status}` });
    }

    const { rows: [order] } = await pool.query(
      `UPDATE orders SET
        status = COALESCE($1, status),
        payment_status = COALESCE($2, payment_status)
      WHERE id = $3 RETURNING *`,
      [status || null, paymentStatus || null, id]
    );

    if (status === "cancelled" && existing.status !== "cancelled") {
      const { rows: items } = await pool.query("SELECT * FROM order_items WHERE order_id = $1", [id]);
      for (const item of items) {
        await pool.query("UPDATE products SET stock = stock + $1 WHERE id = $2", [item.quantity, item.product_id]);
      }
    }

    if (status === "delivered" && existing.status !== "delivered") {
      if (existing.customer_id) {
        const { rows: [customer] } = await pool.query("SELECT * FROM customers WHERE id = $1 LIMIT 1", [existing.customer_id]);
        if (customer?.referred_by) {
          const bonus = Number(order.total_amount) * 0.05;
          await pool.query("UPDATE customers SET referral_credits = referral_credits + $1 WHERE id = $2", [bonus, customer.referred_by]);
        }
      }
    }

    const { rows: items } = await pool.query("SELECT * FROM order_items WHERE order_id = $1", [id]);
    return res.json({ ...order, items });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  } finally { pool.end(); }
});

export default router;