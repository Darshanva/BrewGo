import { pgTable, serial, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

export const addressesTable = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  label: text("label").notNull().default("Home"),
  address: text("address").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Address = typeof addressesTable.$inferSelect;