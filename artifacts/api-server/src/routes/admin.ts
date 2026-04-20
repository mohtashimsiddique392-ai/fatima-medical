import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, productsTable, customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/dashboard", async (_req, res) => {
  const orders = await db.select().from(ordersTable);
  const products = await db.select().from(productsTable).where(eq(productsTable.isActive, true));
  const customers = await db.select().from(customersTable);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalRevenue = orders.filter(o => o.status !== "cancelled").reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const todayRevenue = orders.filter(o => new Date(o.createdAt) >= today && o.status !== "cancelled").reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const lowStockProducts = products.filter(p => p.stock < 10).length;

  const recentOrders = await Promise.all(
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5).map(async (order) => {
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId)).limit(1);
      return { ...order, items, customerName: customer?.name, customerPhone: customer?.phone };
    })
  );

  res.json({
    totalOrders: orders.length,
    pendingOrders,
    totalRevenue,
    todayRevenue,
    totalCustomers: customers.length,
    totalProducts: products.length,
    lowStockProducts,
    recentOrders,
  });
});

router.get("/customers", async (_req, res) => {
  const customers = await db.select().from(customersTable);
  const result = await Promise.all(customers.map(async (c) => {
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.customerId, c.id));
    return { ...c, totalOrders: orders.length };
  }));
  res.json({ customers: result, total: result.length });
});

export default router;
