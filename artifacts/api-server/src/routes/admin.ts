import { Router, type IRouter } from "express";
import { desc, eq, gte, sql } from "drizzle-orm";
import { db, ordersTable, cafesTable, menuItemsTable } from "@workspace/db";
import { onAdminEvent } from "../lib/sse";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

function parseOrder(order: typeof ordersTable.$inferSelect) {
  return {
    ...order,
    items: JSON.parse(order.items || "[]"),
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    discount: Number(order.discount ?? 0),
    total: Number(order.total),
    pointsEarned: order.pointsEarned ?? 0,
    pointsRedeemed: order.pointsRedeemed ?? 0,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt ? order.updatedAt.toISOString() : null,
  };
}

// ── Orders ──────────────────────────────────────────────
router.get("/admin/orders", requireAdmin, async (_req, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(200);
  res.json(orders.map(parseOrder));
});

// ── Sales Dashboard Stats ───────────────────────────────
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const allOrders = await db.select().from(ordersTable);
  const todayOrders = allOrders.filter(
    (o) => new Date(o.createdAt) >= todayStart
  );

  const totalRevenue = allOrders.reduce((s, o) => s + Number(o.total), 0);
  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0);

  const statusCounts: Record<string, number> = {};
  for (const o of allOrders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  }

  const cafes = await db.select().from(cafesTable);
  const menuCount = await db.select({ count: sql<number>`count(*)` }).from(menuItemsTable);

  res.json({
    totalOrders: allOrders.length,
    todayOrders: todayOrders.length,
    totalRevenue: Math.round(totalRevenue),
    todayRevenue: Math.round(todayRevenue),
    statusCounts,
    totalCafes: cafes.length,
    totalMenuItems: Number(menuCount[0]?.count ?? 0),
    activeOrders: allOrders.filter((o) =>
      ["placed", "confirmed", "preparing", "out_for_delivery"].includes(o.status)
    ).length,
  });
});

// ── Cafes CRUD ──────────────────────────────────────────
router.get("/admin/cafes", requireAdmin, async (_req, res): Promise<void> => {
  const cafes = await db.select().from(cafesTable).orderBy(desc(cafesTable.id));
  res.json(cafes);
});

router.post("/admin/cafes", requireAdmin, async (req, res): Promise<void> => {
  try {
    const body = req.body;
    const [cafe] = await db
      .insert(cafesTable)
      .values({
        name: body.name,
        description: body.description || null,
        area: body.area,
        address: body.address,
        rating: body.rating?.toString() || "4.0",
        deliveryTime: body.deliveryTime || 30,
        deliveryFee: body.deliveryFee?.toString() || "30",
        minOrder: body.minOrder?.toString() || "99",
        imageUrl: body.imageUrl || "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
        categories: JSON.stringify(body.categories || []),
        isOpen: body.isOpen ?? true,
        isFeatured: body.isFeatured ?? false,
        discount: body.discount || null,
      })
      .returning();
    res.status(201).json(cafe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create cafe" });
  }
});

router.patch("/admin/cafes/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const body = req.body;
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.area !== undefined) updates.area = body.area;
    if (body.address !== undefined) updates.address = body.address;
    if (body.rating !== undefined) updates.rating = body.rating.toString();
    if (body.deliveryTime !== undefined) updates.deliveryTime = body.deliveryTime;
    if (body.deliveryFee !== undefined) updates.deliveryFee = body.deliveryFee.toString();
    if (body.minOrder !== undefined) updates.minOrder = body.minOrder.toString();
    if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl;
    if (body.categories !== undefined) updates.categories = JSON.stringify(body.categories);
    if (body.isOpen !== undefined) updates.isOpen = body.isOpen;
    if (body.isFeatured !== undefined) updates.isFeatured = body.isFeatured;
    if (body.discount !== undefined) updates.discount = body.discount;

    const [cafe] = await db
      .update(cafesTable)
      .set(updates)
      .where(eq(cafesTable.id, id))
      .returning();

    if (!cafe) {
      res.status(404).json({ error: "Cafe not found" });
      return;
    }
    res.json(cafe);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update cafe" });
  }
});

router.delete("/admin/cafes/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    await db.delete(menuItemsTable).where(eq(menuItemsTable.cafeId, id));
    await db.delete(cafesTable).where(eq(cafesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete cafe" });
  }
});

// ── Menu Items CRUD ─────────────────────────────────────
router.get("/admin/menu", requireAdmin, async (req, res): Promise<void> => {
  const cafeId = req.query.cafeId ? Number(req.query.cafeId) : null;
  let items;
  if (cafeId) {
    items = await db
      .select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.cafeId, cafeId));
  } else {
    items = await db.select().from(menuItemsTable);
  }
  res.json(items);
});

router.post("/admin/menu", requireAdmin, async (req, res): Promise<void> => {
  try {
    const body = req.body;
    const [item] = await db
      .insert(menuItemsTable)
      .values({
        cafeId: body.cafeId,
        name: body.name,
        description: body.description || null,
        price: body.price.toString(),
        category: body.category || "beverage",
        imageUrl: body.imageUrl || "https://images.unsplash.com/photo-1461023058943-07fcbe16d735",
        isAvailable: body.isAvailable ?? true,
        isVeg: body.isVeg ?? true,
        isBestseller: body.isBestseller ?? false,
      })
      .returning();
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create menu item" });
  }
});

router.patch("/admin/menu/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const body = req.body;
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.price !== undefined) updates.price = body.price.toString();
    if (body.category !== undefined) updates.category = body.category;
    if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl;
    if (body.isAvailable !== undefined) updates.isAvailable = body.isAvailable;
    if (body.isVeg !== undefined) updates.isVeg = body.isVeg;
    if (body.isBestseller !== undefined) updates.isBestseller = body.isBestseller;

    const [item] = await db
      .update(menuItemsTable)
      .set(updates)
      .where(eq(menuItemsTable.id, id))
      .returning();

    if (!item) {
      res.status(404).json({ error: "Menu item not found" });
      return;
    }
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update menu item" });
  }
});

router.delete("/admin/menu/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    await db.delete(menuItemsTable).where(eq(menuItemsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete menu item" });
  }
});

// ── SSE Stream ──────────────────────────────────────────
router.get("/admin/orders/stream", requireAdmin, (req, res): void => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, 20000);

  const cleanupNew = onAdminEvent("new_order", (data) => {
    res.write(`event: new_order\ndata: ${JSON.stringify(data)}\n\n`);
  });
  const cleanupUpdate = onAdminEvent("order_update", (data) => {
    res.write(`event: order_update\ndata: ${JSON.stringify(data)}\n\n`);
  });

  req.on("close", () => {
    clearInterval(heartbeat);
    cleanupNew();
    cleanupUpdate();
  });
});

export default router;