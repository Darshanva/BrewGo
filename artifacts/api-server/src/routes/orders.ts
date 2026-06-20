import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, ordersTable, menuItemsTable, cafesTable } from "@workspace/db";
import {
  ListOrdersResponse,
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
} from "@workspace/api-zod";
import { awardRewardPoints } from "./rewards";

const router: IRouter = Router();

function parseOrder(order: typeof ordersTable.$inferSelect) {
  return {
    ...order,
    items: JSON.parse(order.items || "[]"),
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    total: Number(order.total),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt ? order.updatedAt.toISOString() : null,
  };
}

router.get("/orders", async (req, res): Promise<void> => {
  if (req.isAuthenticated()) {
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, req.user.id))
      .orderBy(ordersTable.createdAt);
    res.json(orders.map(parseOrder).reverse());
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

  const { cafeId, items, deliveryAddress } = parsed.data;

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
  const total = subtotal + deliveryFee;
  const userId = req.isAuthenticated() ? req.user.id : null;
  const pointsEarned = userId ? Math.floor(total / 10) : 0;

  const [order] = await db.insert(ordersTable).values({
    userId,
    cafeId,
    cafeName: cafe.name,
    items: JSON.stringify(orderItems),
    status: "placed",
    subtotal: subtotal.toFixed(2),
    deliveryFee: deliveryFee.toFixed(2),
    total: total.toFixed(2),
    deliveryAddress,
    estimatedTime: cafe.deliveryTime,
    pointsEarned,
  }).returning();

  await db.update(cafesTable).set({
    totalOrders: cafe.totalOrders + 1,
  }).where(eq(cafesTable.id, cafeId));

  if (userId && pointsEarned > 0) {
    await awardRewardPoints(userId, order.id, total);
  }

  res.status(201).json(parseOrder(order));
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

  res.json(parseOrder(order));
});

export default router;
