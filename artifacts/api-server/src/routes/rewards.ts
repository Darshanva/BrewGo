import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, userRewardsTable, rewardTransactionsTable } from "@workspace/db";

const router: IRouter = Router();

const TIERS = [
  { name: "Bronze", min: 0, max: 499 },
  { name: "Silver", min: 500, max: 1499 },
  { name: "Gold", min: 1500, max: 4999 },
  { name: "Platinum", min: 5000, max: Infinity },
];

function getTierInfo(lifetimePoints: number) {
  const current = TIERS.findIndex((t) => lifetimePoints >= t.min && lifetimePoints <= t.max);
  const tier = TIERS[current] ?? TIERS[0];
  const next = TIERS[current + 1] ?? null;
  return {
    tier: tier.name,
    nextTier: next ? next.name : null,
    pointsToNextTier: next ? next.min - lifetimePoints : null,
  };
}

router.get("/rewards/me", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;

  let [rewards] = await db
    .select()
    .from(userRewardsTable)
    .where(eq(userRewardsTable.userId, userId));

  if (!rewards) {
    [rewards] = await db
      .insert(userRewardsTable)
      .values({ userId, totalPoints: 0, lifetimePoints: 0, tier: "Bronze" })
      .returning();
  }

  const transactions = await db
    .select()
    .from(rewardTransactionsTable)
    .where(eq(rewardTransactionsTable.userId, userId))
    .orderBy(desc(rewardTransactionsTable.createdAt))
    .limit(20);

  const tierInfo = getTierInfo(rewards.lifetimePoints);

  res.json({
    totalPoints: rewards.totalPoints,
    lifetimePoints: rewards.lifetimePoints,
    tier: tierInfo.tier,
    nextTier: tierInfo.nextTier,
    pointsToNextTier: tierInfo.pointsToNextTier,
    transactions: transactions.map((t) => ({
      id: t.id,
      orderId: t.orderId,
      points: t.points,
      type: t.type,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
  });
});

export async function awardRewardPoints(
  userId: string,
  orderId: number,
  total: number,
) {
  const points = Math.floor(total / 10);
  if (points <= 0) return;

  await db.insert(rewardTransactionsTable).values({
    userId,
    orderId,
    points,
    type: "earned",
    description: `Earned ${points} BrewPoints on order #${orderId}`,
  });

  const [existing] = await db
    .select()
    .from(userRewardsTable)
    .where(eq(userRewardsTable.userId, userId));

  if (existing) {
    const newLifetime = existing.lifetimePoints + points;
    const tierInfo = getTierInfo(newLifetime);
    await db
      .update(userRewardsTable)
      .set({
        totalPoints: existing.totalPoints + points,
        lifetimePoints: newLifetime,
        tier: tierInfo.tier,
      })
      .where(eq(userRewardsTable.userId, userId));
  } else {
    const tierInfo = getTierInfo(points);
    await db.insert(userRewardsTable).values({
      userId,
      totalPoints: points,
      lifetimePoints: points,
      tier: tierInfo.tier,
    });
  }
}

export default router;
