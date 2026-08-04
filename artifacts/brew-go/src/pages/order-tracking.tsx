import { useEffect, useRef, useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetOrder,
  useUpdateOrderStatus,
  getGetOrderQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Clock,
  ChevronLeft,
  MapPin,
  Package,
  Bike,
  Star,
  Wifi,
  Gift,
  ChefHat,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

const STEPS = [
  { key: "placed", label: "Order Placed", icon: <CheckCircle className="w-5 h-5" />, desc: "We've received your order" },
  { key: "confirmed", label: "Confirmed", icon: <CheckCircle className="w-5 h-5" />, desc: "Cafe confirmed your order" },
  { key: "preparing", label: "Preparing", icon: <ChefHat className="w-5 h-5" />, desc: "Your brew is being made" },
  { key: "out_for_delivery", label: "On the Way", icon: <Bike className="w-5 h-5" />, desc: "Rider is heading to you" },
  { key: "delivered", label: "Delivered", icon: <Star className="w-5 h-5" />, desc: "Enjoy your brew!" },
];

const STATUS_ORDER = ["placed", "confirmed", "preparing", "out_for_delivery", "delivered"];

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Order confirmed by cafe ✅",
  preparing: "Your brew is being prepared ☕",
  out_for_delivery: "Rider is on the way 🛵",
  delivered: "Order delivered! Enjoy 🎉",
};

function getNextStatus(current: string) {
  const idx = STATUS_ORDER.indexOf(current);
  return idx >= 0 && idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
}

function useCountdown(createdAt: string | undefined, estimatedMinutes: number | undefined, status: string | undefined) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!createdAt || !estimatedMinutes || status === "delivered" || status === "cancelled") {
      setRemaining(null);
      return;
    }

    const endTime = new Date(createdAt).getTime() + estimatedMinutes * 60 * 1000;

    const tick = () => {
      const diff = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setRemaining(diff);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [createdAt, estimatedMinutes, status]);

  if (remaining === null) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return { mins, secs, total: remaining, isLate: remaining === 0 };
}

export default function OrderTracking() {
  const [, params] = useRoute("/orders/:id");
  const id = Number(params?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [liveConnected, setLiveConnected] = useState(false);
  const closedRef = useRef(false);

  const { data: order, isLoading } = useGetOrder(id, {
    query: {
      enabled: !!id,
      queryKey: getGetOrderQueryKey(id),
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status && ["delivered", "cancelled"].includes(status) ? false : 30000;
      },
    },
  });

  const updateStatus = useUpdateOrderStatus();
  const isTerminal = order && ["delivered", "cancelled"].includes(order.status);
  const countdown = useCountdown(order?.createdAt, order?.estimatedTime, order?.status);

  useEffect(() => {
    if (!id || isTerminal) return;
    closedRef.current = false;
    const es = new EventSource(`${API_BASE}/api/orders/${id}/stream`);

    es.onopen = () => {
      if (!closedRef.current) setLiveConnected(true);
    };
    es.onerror = () => {
      if (!closedRef.current) setLiveConnected(false);
    };
    es.onmessage = (e) => {
      if (closedRef.current) return;
      try {
        const update = JSON.parse(e.data) as { status: string };
        queryClient.setQueryData(getGetOrderQueryKey(id), (old: typeof order) =>
          old ? { ...old, status: update.status } : old
        );
        queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(id) });
        const label = STATUS_LABELS[update.status];
        if (label) toast({ title: label });
      } catch {}
    };

    return () => {
      closedRef.current = true;
      es.close();
      setLiveConnected(false);
    };
  }, [id, !!isTerminal]);

  function handleAdvanceStatus() {
    if (!order) return;
    const next = getNextStatus(order.status);
    if (!next) return;
    updateStatus.mutate(
      {
        id,
        data: {
          status: next as "placed" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled",
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(id) });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return <div className="p-8 text-center text-muted-foreground">Order not found</div>;
  }

  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const isActive = !["delivered", "cancelled"].includes(order.status);
  const nextStatus = getNextStatus(order.status);

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center gap-3 border-b border-border">
        <Link href="/orders" className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-xl">Order #{order.id}</h1>
          <p className="text-sm text-muted-foreground">{order.cafeName}</p>
        </div>
        {isActive && (
          <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full ${liveConnected ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
            <Wifi className="w-3 h-3" />
            {liveConnected ? "LIVE" : "connecting…"}
          </div>
        )}
      </div>

      {/* Countdown banner */}
      {isActive && countdown && (
        <div className="mx-4 mt-4 bg-primary text-primary-foreground rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">
                {countdown.isLate ? "Arriving any moment" : "Estimated arrival"}
              </p>
              {countdown.isLate ? (
                <p className="text-2xl font-bold mt-1">Almost there!</p>
              ) : (
                <p className="text-4xl font-bold mt-1 tabular-nums">
                  {String(countdown.mins).padStart(2, "0")}:{String(countdown.secs).padStart(2, "0")}
                </p>
              )}
              <p className="text-xs opacity-70 mt-1">
                {countdown.isLate ? "Slight delay — hang tight" : `${order.estimatedTime} min estimate`}
              </p>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <Clock className={`w-8 h-8 ${!countdown.isLate ? "animate-pulse" : ""}`} />
            </div>
          </div>
          {/* Progress bar */}
          {!countdown.isLate && order.estimatedTime && (
            <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/80 rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.max(5, 100 - (countdown.total / (order.estimatedTime * 60)) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Delivered banner */}
      {order.status === "delivered" && (
        <div className="mx-4 mt-4 bg-green-600 text-white rounded-2xl p-5 text-center">
          <Star className="w-10 h-10 mx-auto mb-2 fill-white" />
          <p className="font-bold text-xl">Delivered!</p>
          <p className="text-sm opacity-80 mt-1">Hope you enjoyed your brew ☕</p>
        </div>
      )}

      {/* Map placeholder */}
      {isActive && (
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-border relative h-44 bg-muted">
          <iframe
            title="Delivery map"
            className="w-full h-full border-0 grayscale-[30%]"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=77.55%2C12.90%2C77.70%2C13.05&layer=mapnik&marker=12.97,77.59`}
            loading="lazy"
          />
          <div className="absolute bottom-3 left-3 right-3 bg-background/95 backdrop-blur rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bike className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">
                {order.status === "out_for_delivery" ? "Rider on the way" : "Preparing at cafe"}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{order.deliveryAddress}</p>
            </div>
            <MapPin className="w-4 h-4 text-accent shrink-0" />
          </div>
        </div>
      )}

      {/* Points */}
      {(order.pointsEarned ?? 0) > 0 && (
        <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-bold">+{order.pointsEarned} BrewPoints</span> earned
            {(order.pointsRedeemed ?? 0) > 0 && (
              <span> · {order.pointsRedeemed} pts redeemed (₹{Math.floor((order.pointsRedeemed ?? 0) / 10)} off)</span>
            )}
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="mx-4 mt-4 bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold">Order Progress</h2>
          {liveConnected && isActive && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" /> Live
            </span>
          )}
        </div>

        {order.status !== "cancelled" ? (
          <div className="relative">
            {STEPS.map((step, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <div key={step.key} className="flex items-start gap-4 pb-6 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                        done ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"
                      } ${active && isActive ? "ring-4 ring-primary/20 scale-110" : ""}`}
                    >
                      {step.icon}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`w-0.5 flex-1 mt-1 transition-all duration-700 ${
                          done && i < currentIdx ? "bg-primary" : "bg-border"
                        }`}
                        style={{ minHeight: 28 }}
                      />
                    )}
                  </div>
                  <div className="pt-2 flex-1">
                    <p className={`font-bold text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                    {active && <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>}
                  </div>
                  {active && isActive && (
                    <span className="mt-3 w-2.5 h-2.5 rounded-full bg-accent animate-pulse shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-3 text-red-600">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center font-bold">!</div>
            <p className="font-bold">Order Cancelled</p>
          </div>
        )}
      </div>

      {/* Address */}
      <div className="mx-4 mt-4 bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-accent" />
          <h2 className="font-bold">Delivering to</h2>
        </div>
        <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
      </div>

      {/* Items */}
      <div className="mx-4 mt-4 bg-card border border-border rounded-2xl p-4">
        <h2 className="font-bold mb-3">Your Order</h2>
        <div className="space-y-2">
          {(order.items as Array<{ name: string; quantity: number; price: number; imageUrl: string }>).map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-cover rounded-lg" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{item.quantity}× {item.name}</p>
              </div>
              <p className="text-sm font-bold">₹{(item.price * item.quantity).toFixed(0)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-border space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>₹{order.subtotal.toFixed(0)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Delivery fee</span>
            <span>₹{order.deliveryFee.toFixed(0)}</span>
          </div>
          {(order.discount ?? 0) > 0 && (
            <div className="flex justify-between text-amber-700 font-semibold">
              <span>BrewPoints discount</span>
              <span>−₹{(order.discount ?? 0).toFixed(0)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base">
            <span>Total paid</span>
            <span>₹{order.total.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Demo simulate */}
      {isActive && nextStatus && (
        <div className="mx-4 mt-4">
          <button
            onClick={handleAdvanceStatus}
            disabled={updateStatus.isPending}
            className="w-full border-2 border-primary text-primary font-bold py-3 rounded-xl hover:bg-primary/5 transition-colors disabled:opacity-60 text-sm"
          >
            {updateStatus.isPending ? "Updating…" : `Simulate: Move to "${nextStatus.replace(/_/g, " ")}"`}
          </button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Demo button — advances order status live
          </p>
        </div>
      )}
    </div>
  );
}