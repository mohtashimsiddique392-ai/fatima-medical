import { Router } from "express";
import { db, pool } from "@workspace/db";
import { ordersTable, orderItemsTable, productsTable, customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requirePermission } from "../middleware/adminAuth";

const router = Router();

router.get("/dashboard", requirePermission("dashboard"), async (_req, res) => {
  try {
    const orders = await db.select().from(ordersTable);
    const products = await db.select().from(productsTable).where(eq(productsTable.isActive, true));
    const customers = await db.select().from(customersTable);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayStr = new Date().toISOString().split("T")[0];
    const soon = new Date(); soon.setDate(soon.getDate() + 30);
    const soonStr = soon.toISOString().split("T")[0];

    const activeOrders = orders.filter(o => o.status !== "cancelled");
    const totalRevenue = activeOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
    const todayRevenue = activeOrders.filter(o => new Date(o.createdAt) >= today).reduce((s, o) => s + Number(o.totalAmount), 0);
    const pendingOrders = orders.filter(o => o.status === "pending").length;
    const lowStockProducts = products.filter(p => p.stock < 10).length;
    const expiringProducts = products.filter(p => p.expiryDate && p.expiryDate <= soonStr);

    const { rows: billItems } = await pool.query(
      "SELECT bi.product_id, bi.quantity, bi.amount FROM bill_items bi JOIN bills b ON b.id = bi.bill_id"
    );

    let totalCost = 0;
    let totalSalesRevenue = 0;
    for (const item of billItems) {
      const product = products.find(p => p.id === item.product_id);
      const costPrice = product?.costPrice ? Number(product.costPrice) : 0;
      totalCost += costPrice * item.quantity;
      totalSalesRevenue += Number(item.amount);
    }
    const grossProfit = totalSalesRevenue - totalCost;
    const profitMargin = totalSalesRevenue > 0 ? ((grossProfit / totalSalesRevenue) * 100).toFixed(1) : "0";
    const expiredProducts = products.filter(p => p.expiryDate && p.expiryDate < todayStr);
    const expiryLoss = expiredProducts.reduce((s, p) => s + (Number(p.costPrice || 0) * p.stock), 0);

    const recentOrders = await Promise.all(
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5).map(async (order) => {
          const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
          const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, order.customerId)).limit(1);
          return { ...order, items, customerName: customer?.name, customerPhone: customer?.phone };
        })
    );

    res.json({
      totalOrders: orders.length, pendingOrders, totalRevenue, todayRevenue,
      totalCustomers: customers.length, totalProducts: products.length,
      lowStockProducts, expiringCount: expiringProducts.length, recentOrders,
      profit: {
        totalSalesRevenue, totalCost, grossProfit,
        profitMargin: Number(profitMargin), expiryLoss,
        netProfit: grossProfit - expiryLoss,
      }
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/customers", requirePermission("customers"), async (_req, res) => {
  const customers = await db.select().from(customersTable);
  const result = await Promise.all(customers.map(async (c) => {
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.customerId, c.id));
    return { ...c, totalOrders: orders.length };
  }));
  res.json({ customers: result, total: result.length });
});

export default router;