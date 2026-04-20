import { pgTable, serial, text, integer, numeric, boolean, timestamp, varchar, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  password: text("password").notNull(),
  referralCode: varchar("referral_code", { length: 10 }).notNull().unique(),
  referredBy: integer("referred_by"),
  referralCredits: numeric("referral_credits", { precision: 10, scale: 2 }).notNull().default("0"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  stock: integer("stock").notNull().default(0),
  dosage: text("dosage"),
  howToTake: text("how_to_take"),
  sideEffects: text("side_effects"),
  requiresPrescription: boolean("requires_prescription").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  expiryDate: date("expiry_date"),
  batchNumber: varchar("batch_number", { length: 50 }),
  manufacturer: text("manufacturer"),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
  paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("pending"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  address: text("address").notNull(),
  notes: text("notes"),
  creditsUsed: numeric("credits_used", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
});

export const adminTable = pgTable("admin", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  otp: varchar("otp", { length: 6 }),
  otpExpiresAt: timestamp("otp_expires_at"),
});

export const familyMembersTable = pgTable("family_members", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  name: text("name").notNull(),
  relation: varchar("relation", { length: 30 }).notNull(),
  age: integer("age"),
  bloodGroup: varchar("blood_group", { length: 10 }),
  allergies: text("allergies"),
  medicalConditions: text("medical_conditions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const healthRecordsTable = pgTable("health_records", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  familyMemberId: integer("family_member_id"),
  memberName: text("member_name"),
  type: varchar("type", { length: 30 }).notNull(),
  value: text("value").notNull(),
  unit: varchar("unit", { length: 20 }),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true });
export const insertFamilyMemberSchema = createInsertSchema(familyMembersTable).omit({ id: true, createdAt: true });
export const insertHealthRecordSchema = createInsertSchema(healthRecordsTable).omit({ id: true, createdAt: true });

export type Customer = typeof customersTable.$inferSelect;
export type Product = typeof productsTable.$inferSelect;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
export type Admin = typeof adminTable.$inferSelect;
export type FamilyMember = typeof familyMembersTable.$inferSelect;
export type HealthRecord = typeof healthRecordsTable.$inferSelect;
