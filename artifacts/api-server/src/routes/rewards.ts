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

async function getOrCreateRewards(userId: string) {
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
  return rewards;
}

router.get("/rewards/me", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const userId = req.user.id;
  const rewards = await getOrCreateRewards(userId);

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
): Promise<{ tierAchieved: string | null }> {
  const points = Math.floor(total / 10);
  if (points <= 0) return { tierAchieved: null };

  const rewards = await getOrCreateRewards(userId);
  const previousTier = rewards.tier;

  await db.insert(rewardTransactionsTable).values({
    userId,
    orderId,
    points,
    type: "earned",
    description: `Earned ${points} BrewPoints on order #${orderId}`,
  });

  const newLifetime = rewards.lifetimePoints + points;
  const tierInfo = getTierInfo(newLifetime);

  await db
    .update(userRewardsTable)
    .set({
      totalPoints: rewards.totalPoints + points,
      lifetimePoints: newLifetime,
      tier: tierInfo.tier,
    })
    .where(eq(userRewardsTable.userId, userId));

  const tierAchieved = tierInfo.tier !== previousTier ? tierInfo.tier : null;
  return { tierAchieved };
}

export async function deductRewardPoints(userId: string, orderId: number, pointsToRedeem: number) {
  if (pointsToRedeem <= 0) return;

  const rewards = await getOrCreateRewards(userId);
  const actualDeduct = Math.min(pointsToRedeem, rewards.totalPoints);
  if (actualDeduct <= 0) return;

  await db.insert(rewardTransactionsTable).values({
    userId,
    orderId,
    points: actualDeduct,
    type: "redeemed",
    description: `Redeemed ${actualDeduct} BrewPoints on order #${orderId} (₹${(actualDeduct / 10).toFixed(0)} off)`,
  });

  await db
    .update(userRewardsTable)
    .set({ totalPoints: Math.max(0, rewards.totalPoints - actualDeduct) })
    .where(eq(userRewardsTable.userId, userId));
}

export default router;
