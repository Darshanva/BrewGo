import { Router, type IRouter } from "express";
import { ilike, or } from "drizzle-orm";
import { db, menuItemsTable, cafesTable } from "@workspace/db";
import { SearchMenuItemsQueryParams } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/menu-items", async (req, res): Promise<void> => {
  const parsed = SearchMenuItemsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { q, category } = parsed.data;

  const allItems = await db.select().from(menuItemsTable);
  const allCafes = await db.select().from(cafesTable);
  const cafeMap = new Map(allCafes.map(c => [c.id, c.name]));

  let filtered = allItems;
  if (q) {
    filtered = filtered.filter(item =>
      item.name.toLowerCase().includes(q.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(q.toLowerCase()))
    );
  }
  if (category) {
    filtered = filtered.filter(item => item.category === category);
  }

  res.json(filtered.map(item => ({
    ...item,
    cafeName: cafeMap.get(item.cafeId) || "",
    price: Number(item.price),
  })));
});

export default router;
