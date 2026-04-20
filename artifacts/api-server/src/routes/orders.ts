import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, productsTable, customersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  const { customerId, status } = req.query as { customerId?: string; status?: string };
  let orders = await db.select().from(ordersTable);
  if (customerId) orders = orders.filter(o => o.customerId === Number(customerId));
  if (status) orders = orders.filter(o => o.status === status);

  const result = await Promise.all(orders.map(async (order) => {
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId)).limit(1);
    return { ...order, items, customerName: customer?.name, customerPhone: customer?.phone };
  }));

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ orders: result, total: result.length });
});

router.get("/:id", async (req, res) => {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, Number(req.params.id))).limit(1);
  if (!order) return res.status(404).json({ error: "Order not found" });
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId)).limit(1);
  res.json({ ...order, items, customerName: customer?.name, customerPhone: customer?.phone });
});

router.post("/", async (req, res) => {
  const { customerId, items, paymentMethod, address, notes, useReferralCredits } = req.body;
  if (!customerId || !items?.length || !paymentMethod || !address) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId)).limit(1);
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  let total = 0;
  const enrichedItems: { productId: number; productName: string; quantity: number; price: number }[] = [];

  for (const item of items) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId)).limit(1);
    if (!product) return res.status(404).json({ error: `Product ${item.productId} not found` });
    if (product.stock < item.quantity) return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
    const itemTotal = Number(product.price) * item.quantity;
    total += itemTotal;
    enrichedItems.push({ productId: product.id, productName: product.name, quantity: item.quantity, price: Number(product.price) });
  }

  let creditsUsed = 0;
  if (useReferralCredits && Number(customer.referralCredits) > 0) {
    creditsUsed = Math.min(Number(customer.referralCredits), total);
    total -= creditsUsed;
  }

  const [order] = await db.insert(ordersTable).values({
    customerId,
    totalAmount: String(total),
    paymentMethod,
    paymentStatus: paymentMethod === "cash_on_delivery" ? "pending" : "pending",
    status: "pending",
    address,
    notes,
    creditsUsed: String(creditsUsed),
  }).returning();

  for (const item of enrichedItems) {
    await db.insert(orderItemsTable).values({ orderId: order.id, ...item, price: String(item.price) });
    await db.update(productsTable).set({ stock: sql`${productsTable.stock} - ${item.quantity}` }).where(eq(productsTable.id, item.productId));
  }

  if (creditsUsed > 0) {
    await db.update(customersTable).set({ referralCredits: String(Number(customer.referralCredits) - creditsUsed) }).where(eq(customersTable.id, customerId));
  }

  const items2 = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  res.status(201).json({ ...order, items: items2, customerName: customer.name, customerPhone: customer.phone });
});

router.put("/:id/status", async (req, res) => {
  const { status, paymentStatus } = req.body;
  const [order] = await db.update(ordersTable).set({
    ...(status && { status }),
    ...(paymentStatus && { paymentStatus }),
  }).where(eq(ordersTable.id, Number(req.params.id))).returning();

  if (!order) return res.status(404).json({ error: "Order not found" });

  // Grant referral credit when order delivered
  if (status === "delivered") {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId)).limit(1);
    if (customer?.referredBy) {
      const bonus = Number(order.totalAmount) * 0.05;
      await db.update(customersTable).set({ referralCredits: String(Number(customer.referralCredits) + bonus) }).where(eq(customersTable.id, customer.referredBy));
    }
  }

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  res.json({ ...order, items });
});

export default router;
