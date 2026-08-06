import { useState, useMemo, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useCart } from "@/lib/cart-context";
import {
  useCreateOrder,
  getListOrdersQueryKey,
  useGetMyRewards,
  getGetMyRewardsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Plus, Minus, Trash2, MapPin, ChevronRight, Gift, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

const BANGALORE_ADDRESSES = [
  "4th Block, Koramangala, Bangalore 560034",
  "12th Main, Indiranagar, Bangalore 560038",
  "Sector 2, HSR Layout, Bangalore 560102",
  "4th T Block, Jayanagar, Bangalore 560041",
  "ITPL Main Road, Whitefield, Bangalore 560066",
  "MG Road, Bangalore 560001",
];

const TIER_MESSAGES: Record<string, { emoji: string; msg: string }> = {
  Silver: { emoji: "🥈", msg: "You've hit Silver status! Enjoy 2× BrewPoints on your next order." },
  Gold: { emoji: "🥇", msg: "Gold tier unlocked! Exclusive perks are now yours." },
  Platinum: { emoji: "💎", msg: "PLATINUM! You're a BrewGo legend. Maximum rewards await." },
};

export default function Cart() {
  const { items, removeItem, updateQuantity, clearCart, subtotal, cafeId } = useCart();
  const [address, setAddress] = useState(BANGALORE_ADDRESSES[0]);
  const [customAddress, setCustomAddress] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [redeemEnabled, setRedeemEnabled] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    setIsAuthenticated(!!(token && user));
  }, []);

  const { data: rewards } = useGetMyRewards({
    query: {
      queryKey: getGetMyRewardsQueryKey(),
      enabled: isAuthenticated,
    },
  });

  const createOrder = useCreateOrder();
  const deliveryFee = items.length > 0 ? (subtotal >= 299 ? 0 : 39) : 0;

  const maxRedeemable = useMemo(() => {
    if (!rewards) return 0;
    const maxByBalance = Math.floor(rewards.totalPoints / 100) * 100;
    const maxByOrder = Math.floor((subtotal + deliveryFee) / 10) * 100;
    return Math.min(maxByBalance, maxByOrder);
  }, [rewards, subtotal, deliveryFee]);

  const discount = redeemEnabled ? pointsToRedeem / 10 : 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);
  const pointsWillEarn = isAuthenticated ? Math.floor(total / 10) : 0;

  function handleRedeemToggle(checked: boolean) {
    setRedeemEnabled(checked);
    if (!checked) setPointsToRedeem(0);
    else if (maxRedeemable > 0) setPointsToRedeem(maxRedeemable);
  }

  function handlePlaceOrder() {
    if (!isAuthenticated) {
      toast({ title: "Please login to place order", variant: "destructive" });
      navigate("/login");
      return;
    }

    if (!cafeId) return;

    const deliveryAddress = useCustom ? customAddress : address;
    if (!deliveryAddress.trim()) {
      toast({ title: "Please enter a delivery address", variant: "destructive" });
      return;
    }

    createOrder.mutate(
      {
        data: {
          cafeId,
          items: items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
          deliveryAddress,
          pointsToRedeem: redeemEnabled ? pointsToRedeem : 0,
        },
      },
      {
        onSuccess: (order) => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMyRewardsQueryKey() });
          clearCart();
          if (order.tierAchieved && TIER_MESSAGES[order.tierAchieved]) {
            const { emoji, msg } = TIER_MESSAGES[order.tierAchieved];
            setTimeout(() => {
              toast({
                title: `${emoji} ${order.tierAchieved} tier achieved!`,
                description: msg,
                duration: 6000,
              });
            }, 800);
          }
          navigate(`/orders/${order.id}`);
        },
        onError: () => {
          toast({ title: "Failed to place order", description: "Please try again", variant: "destructive" });
        },
      }
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-8 text-center">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-12 h-12 text-muted-foreground" />
        </div>
        <h2 className="font-bold text-xl mb-2">Your cart is empty</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Discover Bangalore's best cafes and add your favourite brews
        </p>
        <Link href="/cafes">
          <button className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors">
            Browse Cafes
          </button>
        </Link>
      </div>
    );
  }

  return (
<div className="pb-48 md:pb-40">      <div className="px-4 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold">Your Cart</h1>
        {items[0] && (
          <p className="text-muted-foreground text-sm mt-1">from {items[0].cafeName}</p>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">
        {items.map((item) => (
          <div key={`${item.menuItemId}-${item.customization}`} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{item.name}</p>
              <p className="text-sm font-bold text-accent mt-1">₹{item.price}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                className="w-7 h-7 rounded-full border-2 border-primary text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {item.quantity === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
              </button>
              <span className="font-bold text-sm w-5 text-center">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <p className="font-bold text-sm w-16 text-right shrink-0">₹{(item.price * item.quantity).toFixed(0)}</p>
          </div>
        ))}
      </div>

      {isAuthenticated && rewards && rewards.totalPoints >= 100 && (
        <div className="mx-4 mb-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-400/20 flex items-center justify-center">
                <Gift className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-sm text-amber-900">Redeem BrewPoints</p>
                <p className="text-xs text-amber-700">{rewards.totalPoints} pts available · 100 pts = ₹10 off</p>
              </div>
            </div>
            <Switch
              checked={redeemEnabled}
              onCheckedChange={handleRedeemToggle}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
          {redeemEnabled && maxRedeemable > 0 && (
            <div className="mt-3 pt-3 border-t border-amber-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-amber-900">Points to use</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-amber-700">{pointsToRedeem} pts</span>
                  <span className="text-xs text-amber-600 ml-1">= ₹{(pointsToRedeem / 10).toFixed(0)} off</span>
                </div>
              </div>
              <Slider
                min={0}
                max={maxRedeemable}
                step={100}
                value={[pointsToRedeem]}
                onValueChange={([v]) => setPointsToRedeem(v ?? 0)}
              />
              <div className="flex justify-between text-xs text-amber-600 mt-1.5">
                <span>0 pts</span>
                <span>{maxRedeemable} pts max</span>
              </div>
            </div>
          )}
        </div>
      )}

      {!isAuthenticated && (
        <div className="mx-4 mb-4 bg-muted rounded-2xl p-4 flex items-center gap-3">
          <Star className="w-5 h-5 text-accent shrink-0" />
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="font-bold text-foreground hover:underline">Sign in</Link>{" "}
            to earn BrewPoints and place order
          </p>
        </div>
      )}

      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent" />
            <h2 className="font-bold">Delivery Address</h2>
          </div>
          <button onClick={() => setUseCustom(!useCustom)} className="text-xs font-bold text-accent">
            {useCustom ? "Choose saved" : "Enter custom"}
          </button>
        </div>
        {useCustom ? (
          <input
            value={customAddress}
            onChange={(e) => setCustomAddress(e.target.value)}
            placeholder="Enter your full address in Bangalore…"
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        ) : (
          <div className="space-y-2">
            {BANGALORE_ADDRESSES.map((addr) => (
              <button
                key={addr}
                onClick={() => setAddress(addr)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors flex items-center justify-between ${
                  address === addr
                    ? "bg-primary/5 border-primary text-foreground"
                    : "bg-muted border-transparent text-muted-foreground"
                }`}
              >
                {addr}
                {address === addr && <ChevronRight className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-4 border-t border-border">
        <h2 className="font-bold mb-3">Order Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">₹{subtotal.toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery fee</span>
            <span className={`font-semibold ${deliveryFee === 0 ? "text-green-600" : ""}`}>
              {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
            </span>
          </div>
          {deliveryFee === 0 && (
            <p className="text-xs text-green-600 font-medium">Free delivery on orders above ₹299</p>
          )}
          {redeemEnabled && discount > 0 && (
            <div className="flex justify-between text-amber-700">
              <span className="font-semibold flex items-center gap-1">
                <Gift className="w-3.5 h-3.5" /> BrewPoints discount
              </span>
              <span className="font-bold">−₹{discount.toFixed(0)}</span>
            </div>
          )}
          <div className="flex justify-between pt-3 border-t border-border">
            <span className="font-bold">Total</span>
            <span className="font-bold text-lg">₹{total.toFixed(0)}</span>
          </div>
          {pointsWillEarn > 0 && (
            <div className="flex items-center gap-1.5 justify-end text-xs text-amber-600 font-semibold">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              You'll earn {pointsWillEarn} BrewPoints
            </div>
          )}
        </div>
      </div>

<div className="fixed bottom-[72px] md:bottom-0 left-0 right-0 md:left-64 p-4 bg-background/90 backdrop-blur-md border-t border-border z-20">        <button
          onClick={handlePlaceOrder}
          disabled={createOrder.isPending}
          className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-2xl text-base hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-xl"
        >
          {createOrder.isPending
            ? "Placing Order…"
            : !isAuthenticated
            ? "Login to Place Order"
            : `Place Order · ₹${total.toFixed(0)}${discount > 0 ? ` (₹${discount.toFixed(0)} saved)` : ""}`}
        </button>
      </div>
    </div>
  );
}