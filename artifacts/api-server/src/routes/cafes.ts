import { Router, type IRouter } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, cafesTable, menuItemsTable, reviewsTable } from "@workspace/db";
import {
  ListCafesQueryParams,
  CreateCafeBody,
  GetCafeParams,
  GetCafeMenuParams,
  GetCafeReviewsParams,
  CreateReviewParams,
  CreateReviewBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseCafe(cafe: typeof cafesTable.$inferSelect) {
  return {
    ...cafe,
    rating: Number(cafe.rating),
    deliveryFee: Number(cafe.deliveryFee),
    minOrder: Number(cafe.minOrder),
    latitude: cafe.latitude != null ? Number(cafe.latitude) : null,
    longitude: cafe.longitude != null ? Number(cafe.longitude) : null,
    categories: JSON.parse(cafe.categories || "[]"),
  };
}

router.get("/cafes", async (req, res): Promise<void> => {
  const parsed = ListCafesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { area, category, search, sortBy } = parsed.data;

  let query = db.select().from(cafesTable).$dynamic();

  const conditions = [];
  if (area) conditions.push(eq(cafesTable.area, area));
  if (search) {
    conditions.push(
      or(
        ilike(cafesTable.name, `%${search}%`),
        ilike(cafesTable.area, `%${search}%`)
      )!
    );
  }
  if (category) {
    conditions.push(sql`${cafesTable.categories}::text ilike ${'%' + category + '%'}`);
  }

  if (conditions.length > 0) {
    query = query.where(conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`);
  }

  const cafes = await db.select().from(cafesTable);
  let filtered = cafes;

  if (area) filtered = filtered.filter(c => c.area === area);
  if (search) filtered = filtered.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.area.toLowerCase().includes(search.toLowerCase())
  );
  if (category) filtered = filtered.filter(c =>
    JSON.parse(c.categories || "[]").includes(category)
  );

  if (sortBy === "rating") filtered.sort((a, b) => Number(b.rating) - Number(a.rating));
  else if (sortBy === "deliveryTime") filtered.sort((a, b) => a.deliveryTime - b.deliveryTime);
  else if (sortBy === "popularity") filtered.sort((a, b) => b.totalOrders - a.totalOrders);

  res.json(filtered.map(parseCafe));
});

router.post("/cafes", async (req, res): Promise<void> => {
  const parsed = CreateCafeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { categories, latitude, longitude, deliveryFee, minOrder, ...rest } = parsed.data;

  const [cafe] = await db.insert(cafesTable).values({
    ...rest,
    categories: JSON.stringify(categories || []),
    latitude: latitude?.toString(),
    longitude: longitude?.toString(),
    deliveryFee: deliveryFee.toString(),
    minOrder: minOrder.toString(),
  }).returning();

  res.status(201).json(parseCafe(cafe));
});

router.get("/cafes/:id", async (req, res): Promise<void> => {
  const params = GetCafeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [cafe] = await db.select().from(cafesTable).where(eq(cafesTable.id, params.data.id));
  if (!cafe) {
    res.status(404).json({ error: "Cafe not found" });
    return;
  }

  res.json(parseCafe(cafe));
});

router.get("/cafes/:id/menu", async (req, res): Promise<void> => {
  const params = GetCafeMenuParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [cafe] = await db.select().from(cafesTable).where(eq(cafesTable.id, params.data.id));
  if (!cafe) {
    res.status(404).json({ error: "Cafe not found" });
    return;
  }

  const items = await db.select().from(menuItemsTable).where(eq(menuItemsTable.cafeId, params.data.id));

  res.json(items.map(item => ({
    ...item,
    cafeName: cafe.name,
    price: Number(item.price),
  })));
});

router.get("/cafes/:id/reviews", async (req, res): Promise<void> => {
  const params = GetCafeReviewsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.cafeId, params.data.id));

  res.json(reviews.map(r => ({
    ...r,
    rating: Number(r.rating),
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/cafes/:id/reviews", async (req, res): Promise<void> => {
  const params = CreateReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    cafeId: params.data.id,
    rating: parsed.data.rating.toString(),
    comment: parsed.data.comment,
    reviewerName: parsed.data.reviewerName,
  }).returning();

  const [cafe] = await db.select().from(cafesTable).where(eq(cafesTable.id, params.data.id));
  if (cafe) {
    const allReviews = await db.select().from(reviewsTable).where(eq(reviewsTable.cafeId, params.data.id));
    const avgRating = allReviews.reduce((sum, r) => sum + Number(r.rating), 0) / allReviews.length;
    await db.update(cafesTable).set({
      rating: avgRating.toFixed(1),
      reviewCount: allReviews.length,
    }).where(eq(cafesTable.id, params.data.id));
  }

  res.status(201).json({
    ...review,
    rating: Number(review.rating),
    createdAt: review.createdAt.toISOString(),
  });
});

export default router;
