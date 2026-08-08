import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db, favoritesTable, cafesTable } from "@workspace/db";

const router: IRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "brewgo-secret-change-me";

function getUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET) as { id: string };
    return payload.id;
  } catch {
    return null;
  }
}

// List my favorite cafes
router.get("/favorites", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Login required" });

  const favs = await db
    .select({
      id: favoritesTable.id,
      cafeId: favoritesTable.cafeId,
      createdAt: favoritesTable.createdAt,
      name: cafesTable.name,
      area: cafesTable.area,
      rating: cafesTable.rating,
      deliveryTime: cafesTable.deliveryTime,
      imageUrl: cafesTable.imageUrl,
      deliveryFee: cafesTable.deliveryFee,
    })
    .from(favoritesTable)
    .innerJoin(cafesTable, eq(favoritesTable.cafeId, cafesTable.id))
    .where(eq(favoritesTable.userId, userId));

  res.json(favs);
});

// Add favorite
router.post("/favorites", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Login required" });

  const cafeId = Number(req.body.cafeId);
  if (!cafeId) return res.status(400).json({ error: "cafeId required" });

  try {
    const [row] = await db
      .insert(favoritesTable)
      .values({ userId, cafeId })
      .returning();
    res.status(201).json(row);
  } catch {
    res.status(400).json({ error: "Already favorited or invalid cafe" });
  }
});

// Remove favorite
router.delete("/favorites/:cafeId", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Login required" });

  const cafeId = Number(req.params.cafeId);
  await db
    .delete(favoritesTable)
    .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.cafeId, cafeId)));

  res.json({ success: true });
});

// Check if cafe is favorited
router.get("/favorites/check/:cafeId", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.json({ isFavorite: false });

  const cafeId = Number(req.params.cafeId);
  const [row] = await db
    .select()
    .from(favoritesTable)
    .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.cafeId, cafeId)))
    .limit(1);

  res.json({ isFavorite: !!row });
});

export default router;