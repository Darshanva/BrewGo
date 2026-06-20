import { pgTable, serial, text, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cafesTable = pgTable("cafes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  area: text("area").notNull(),
  address: text("address").notNull(),
  rating: numeric("rating", { precision: 3, scale: 1 }).notNull().default("4.0"),
  reviewCount: integer("review_count").notNull().default(0),
  deliveryTime: integer("delivery_time").notNull().default(30),
  deliveryFee: numeric("delivery_fee", { precision: 8, scale: 2 }).notNull().default("30"),
  minOrder: numeric("min_order", { precision: 8, scale: 2 }).notNull().default("99"),
  imageUrl: text("image_url").notNull(),
  categories: text("categories").notNull().default("[]"),
  isOpen: boolean("is_open").notNull().default(true),
  totalOrders: integer("total_orders").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
  discount: text("discount"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCafeSchema = createInsertSchema(cafesTable).omit({ id: true, createdAt: true });
export type InsertCafe = z.infer<typeof insertCafeSchema>;
export type Cafe = typeof cafesTable.$inferSelect;
