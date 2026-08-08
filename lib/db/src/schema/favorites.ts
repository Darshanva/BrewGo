import { pgTable, serial, varchar, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const favoritesTable = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull(),
    cafeId: integer("cafe_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("favorites_user_cafe").on(table.userId, table.cafeId)]
);

export type Favorite = typeof favoritesTable.$inferSelect;