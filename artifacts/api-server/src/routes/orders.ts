import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, ordersTable, menuItemsTable, cafesTable, userRewardsTable } from "@workspace/db";
import {
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
} from "@workspace/api-zod";
import { awardRewardPoints, deductRewardPoints } from "./rewards";
import { emitOrderUpdate, onOrderUpdate } from "../lib/sse";

const router: IRouter = Router();

function parseOrder(order: typeof ordersTable.$inferSelect, extra?: Record<string, unknown>) {
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
    tierAchieved: null as string | null,
    ...extra,
  };
}

router.get("/orders", async (req, res): Promise<void> => {
  if (req.isAuthenticated()) {
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, req.user.id))
      .orderBy(ordersTable.createdAt);
    res.json(orders.map((o) => parseOrder(o)).reverse());
  } else {
    res.json([]);
  }
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { cafeId, items, deliveryAddress, pointsToRedeem = 0 } = parsed.data;

  const [cafe] = await db.select().from(cafesTable).where(eq(cafesTable.id, cafeId));
  if (!cafe) {
    res.status(404).json({ error: "Cafe not found" });
    return;
  }

  const orderItems: Array<{
    menuItemId: number;
    name: string;
    price: number;
    quantity: number;
    imageUrl: string;
    customization: string | null;
  }> = [];

  let subtotal = 0;
  for (const item of items) {
    const [menuItem] = await db.select().from(menuItemsTable).where(eq(menuItemsTable.id, item.menuItemId));
    if (!menuItem) {
      res.status(404).json({ error: `Menu item ${item.menuItemId} not found` });
      return;
    }
    const price = Number(menuItem.price);
    orderItems.push({
      menuItemId: item.menuItemId,
      name: menuItem.name,
      price,
      quantity: item.quantity,
      imageUrl: menuItem.imageUrl,
      customization: item.customization || null,
    });
    subtotal += price * item.quantity;
  }

  const deliveryFee = Number(cafe.deliveryFee);
  const userId = req.isAuthenticated() ? req.user.id : null;

  let actualPointsToRedeem = 0;
  let discount = 0;

  if (userId && pointsToRedeem > 0) {
    const validPoints = Math.floor(pointsToRedeem / 100) * 100;
    if (validPoints > 0) {
      const [rewardRow] = await db
        .select()
        .from(userRewardsTable)
        .where(eq(userRewardsTable.userId, userId));
      const availablePoints = rewardRow?.totalPoints ?? 0;
      actualPointsToRedeem = Math.min(validPoints, availablePoints);
      discount = actualPointsToRedeem / 10;
    }
  }

  const total = Math.max(0, subtotal + deliveryFee - discount);
  const pointsEarned = userId ? Math.floor(total / 10) : 0;

  const [order] = await db.insert(ordersTable).values({
    userId,
    cafeId,
    cafeName: cafe.name,
    items: JSON.stringify(orderItems),
    status: "placed",
    subtotal: subtotal.toFixed(2),
    deliveryFee: deliveryFee.toFixed(2),
    discount: discount.toFixed(2),
    total: total.toFixed(2),
    deliveryAddress,
    estimatedTime: cafe.deliveryTime,
    pointsEarned,
    pointsRedeemed: actualPointsToRedeem,
  }).returning();

  await db.update(cafesTable).set({ totalOrders: cafe.totalOrders + 1 }).where(eq(cafesTable.id, cafeId));

  let tierAchieved: string | null = null;
  if (userId) {
    if (actualPointsToRedeem > 0) {
      await deductRewardPoints(userId, order.id, actualPointsToRedeem);
    }
    if (pointsEarned > 0) {
      const result = await awardRewardPoints(userId, order.id, total);
      tierAchieved = result.tierAchieved;
    }
  }

  res.status(201).json(parseOrder(order, { tierAchieved }));
});

// SSE stream for real-time order status updates
router.get("/orders/:id/stream", (req, res): void => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).end();
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Send heartbeat every 20s to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, 20000);

  const cleanup = onOrderUpdate(id, (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });

  req.on("close", () => {
    clearInterval(heartbeat);
    cleanup();
  });
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const minutesSinceOrder = Math.floor((Date.now() - order.createdAt.getTime()) / 60000);
  const estimatedTime = Math.max(0, order.estimatedTime - minutesSinceOrder);

  res.json({ ...parseOrder(order), estimatedTime });
});

router.patch("/orders/:id/status", async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db.update(ordersTable).set({
    status: parsed.data.status,
    updatedAt: new Date(),
  }).where(eq(ordersTable.id, params.data.id)).returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  // Broadcast real-time update to all SSE listeners for this order
  emitOrderUpdate(order.id, {
    status: order.status,
    updatedAt: order.updatedAt?.toISOString() ?? null,
  });

  res.json(parseOrder(order));
});

export default router;
