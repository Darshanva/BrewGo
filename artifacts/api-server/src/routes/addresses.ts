import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db, addressesTable } from "@workspace/db";

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

// List my addresses
router.get("/addresses", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Login required" });

  const addresses = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.userId, userId));

  res.json(addresses);
});

// Add address
router.post("/addresses", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Login required" });

  const { label, address, isDefault } = req.body;
  if (!address?.trim()) return res.status(400).json({ error: "Address required" });

  if (isDefault) {
    await db
      .update(addressesTable)
      .set({ isDefault: false })
      .where(eq(addressesTable.userId, userId));
  }

  const [row] = await db
    .insert(addressesTable)
    .values({
      userId,
      label: label || "Home",
      address: address.trim(),
      isDefault: !!isDefault,
    })
    .returning();

  res.status(201).json(row);
});

// Delete address
router.delete("/addresses/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Login required" });

  const id = Number(req.params.id);
  await db
    .delete(addressesTable)
    .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId)));

  res.json({ success: true });
});

export default router;