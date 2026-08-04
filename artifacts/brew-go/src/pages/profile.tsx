import { useEffect, useState } from "react";
import { useGetMyRewards, getGetMyRewardsQueryKey } from "@workspace/api-client-react";
import { Star, Trophy, Gift, ChevronRight, LogOut, Coffee } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";

type LocalUser = {
  id: string;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  isAdmin?: boolean;
};

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Bronze: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
  Silver: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" },
  Gold: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-400" },
  Platinum: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-400" },
};

export default function Profile() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
    setAuthLoading(false);
  }, []);

  const isAuthenticated = !!user;

  const { data: rewards, isLoading: rewardsLoading } = useGetMyRewards({
    query: {
      queryKey: getGetMyRewardsQueryKey(),
      enabled: isAuthenticated,
    },
  });

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setLocation("/");
    window.location.reload();
  };

  if (authLoading) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Coffee className="w-12 h-12 text-primary" />
        </div>
        <h2 className="font-bold text-2xl mb-2">Sign in to BrewGo</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Sign in to track your orders, earn BrewPoints, and unlock exclusive rewards
        </p>
        <Link href="/login">
          <button className="bg-primary text-primary-foreground font-bold px-8 py-3.5 rounded-2xl hover:bg-primary/90 transition-colors shadow-lg">
            Log in
          </button>
        </Link>
        <p className="mt-4 text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    );
  }

  const tier = rewards?.tier ?? "Bronze";
  const tierStyle = TIER_COLORS[tier] ?? TIER_COLORS.Bronze;
  const progressPct = rewards?.pointsToNextTier
    ? Math.min(100, Math.round((rewards.lifetimePoints / (rewards.lifetimePoints + rewards.pointsToNextTier)) * 100))
    : 100;

  return (
    <div className="pb-8">
      <div className="bg-primary text-primary-foreground px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-4">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="Profile" className="w-16 h-16 rounded-full border-2 border-white/30 object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {user?.firstName?.[0] ?? user?.email?.[0] ?? "?"}
            </div>
          )}
          <div className="flex-1">
            <h1 className="font-bold text-xl">
              {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "BrewGo User"}
            </h1>
            <p className="text-primary-foreground/70 text-sm">{user?.email || user?.phone}</p>
            <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs font-bold border ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}>
              <Trophy className="w-3 h-3" />
              {tier} Member
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4">
        {rewardsLoading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : rewards ? (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">BrewPoints Balance</p>
                <p className="text-4xl font-bold text-primary mt-1">{rewards.totalPoints.toLocaleString()}</p>
              </div>
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Gift className="w-7 h-7 text-primary" />
              </div>
            </div>
            {rewards.nextTier && rewards.pointsToNextTier !== null && (
              <div>
                <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1.5">
                  <span>{tier}</span>
                  <span>{rewards.pointsToNextTier} pts to {rewards.nextTier}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
            {!rewards.nextTier && (
              <div className="flex items-center gap-2 text-sm text-yellow-600 font-bold">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                Platinum — Highest tier achieved!
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Lifetime earned</p>
                <p className="font-bold">{rewards.lifetimePoints.toLocaleString()} pts</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground text-xs">Approximate value</p>
                <p className="font-bold">₹{Math.floor(rewards.totalPoints / 10)}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="px-4 mt-5">
        <h2 className="font-bold text-base mb-3">How BrewPoints Work</h2>
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {[
            { icon: "☕", title: "Earn on every order", desc: "1 BrewPoint per ₹10 spent" },
            { icon: "🎁", title: "Redeem for discounts", desc: "100 points = ₹10 off your order" },
            { icon: "🏆", title: "Unlock tier perks", desc: "Silver (500pts), Gold (1500pts), Platinum (5000pts)" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-4">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="font-bold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {rewards && rewards.transactions.length > 0 && (
        <div className="px-4 mt-5">
          <h2 className="font-bold text-base mb-3">Recent Activity</h2>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border">
            {rewards.transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-semibold">{tx.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <span className={`font-bold text-sm ${tx.type === "earned" ? "text-green-600" : "text-red-500"}`}>
                  {tx.type === "earned" ? "+" : "-"}{tx.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 mt-5">
        <Link href="/orders">
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
            <span className="font-semibold">Order History</span>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Link>
        <button
          onClick={logout}
          className="w-full mt-3 flex items-center justify-center gap-2 text-red-500 font-bold py-4 rounded-2xl border border-red-200 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </div>
  );
}