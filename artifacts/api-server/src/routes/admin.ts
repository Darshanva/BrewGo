import { Router, type IRouter } from "express";
import { desc, notInArray } from "drizzle-orm";
import { db, ordersTable, cafesTable } from "@workspace/db";
import { onAdminEvent } from "../lib/sse";

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

/** List all orders — active ones first, then recently delivered/cancelled */
router.get("/admin/orders", async (_req, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(200);

  res.json(orders.map(parseOrder));
});

/** List all cafes for the admin header stats */
router.get("/admin/cafes/stats", async (_req, res): Promise<void> => {
  const cafes = await db.select({ id: cafesTable.id, name: cafesTable.name, totalOrders: cafesTable.totalOrders }).from(cafesTable);
  res.json(cafes);
});

/** SSE stream — admin panel gets new orders and status updates in real time */
router.get("/admin/orders/stream", (req, res): void => {
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
