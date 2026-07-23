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
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  {
    key: "placed",
    label: "Order Placed",
    icon: <CheckCircle className="w-5 h-5" />,
    desc: "We've received your order",
  },
  {
    key: "confirmed",
    label: "Confirmed",
    icon: <CheckCircle className="w-5 h-5" />,
    desc: "Cafe confirmed your order",
  },
  {
    key: "preparing",
    label: "Preparing",
    icon: <Package className="w-5 h-5" />,
    desc: "Your brew is being made",
  },
  {
    key: "out_for_delivery",
    label: "On the Way",
    icon: <Bike className="w-5 h-5" />,
    desc: "Your order is out for delivery",
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: <Star className="w-5 h-5" />,
    desc: "Enjoy your brew!",
  },
];

const STATUS_ORDER = [
  "placed",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
];

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Order confirmed by cafe ✅",
  preparing: "Your brew is being prepared ☕",
  out_for_delivery: "Rider is on the way 🛵",
  delivered: "Order delivered! Enjoy your brew 🎉",
};

function getNextStatus(current: string) {
  const idx = STATUS_ORDER.indexOf(current);
  return idx >= 0 && idx < STATUS_ORDER.length - 1
    ? STATUS_ORDER[idx + 1]
    : null;
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
      // SSE drives live updates; 30s poll is a safety net only
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        return status && ["delivered", "cancelled"].includes(status)
          ? false
          : 30000;
      },
    },
  });

  const updateStatus = useUpdateOrderStatus();
  const isTerminal = order && ["delivered", "cancelled"].includes(order.status);

  // SSE connection for real-time status push
  useEffect(() => {
    if (!id || isTerminal) return;
    closedRef.current = false;

    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
    const es = new EventSource(`${baseUrl}/api/orders/${id}/stream`);

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
        // Instantly update the cached order so UI reacts without a round-trip
        queryClient.setQueryData(
          getGetOrderQueryKey(id),
          (old: typeof order) =>
            old ? { ...old, status: update.status } : old,
        );
        queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(id) });

        const label = STATUS_LABELS[update.status];
        if (label) toast({ title: label });
      } catch {
        // ignore parse errors on heartbeat comments
      }
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
          status: next as
            | "placed"
            | "confirmed"
            | "preparing"
            | "out_for_delivery"
            | "delivered"
            | "cancelled",
        },
      },
      {
        onSuccess: () => {
          // SSE will push the update back to all connected clients automatically
          queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(id) });
        },
      },
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

  if (!order)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Order not found
      </div>
    );

  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const isActive = !["delivered", "cancelled"].includes(order.status);
  const nextStatus = getNextStatus(order.status);

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center gap-3 border-b border-border">
        <Link
          href="/orders"
          className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-xl">Order #{order.id}</h1>
          <p className="text-sm text-muted-foreground">{order.cafeName}</p>
        </div>
        {isActive && (
          <div
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-full transition-colors ${liveConnected ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}
          >
            <Wifi className="w-3 h-3" />
            {liveConnected ? "LIVE" : "connecting…"}
          </div>
        )}
      </div>

      {/* ETA banner */}
      {isActive && (
        <div className="mx-4 mt-4 bg-primary text-primary-foreground rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-80">Estimated delivery</p>
            <p className="text-2xl font-bold">{order.estimatedTime} min</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            <Clock className="w-7 h-7 animate-pulse" />
          </div>
        </div>
      )}

      {/* Delivered banner */}
      {order.status === "delivered" && (
        <div className="mx-4 mt-4 bg-green-600 text-white rounded-2xl p-4 text-center">
          <Star className="w-8 h-8 mx-auto mb-1 fill-white" />
          <p className="font-bold text-lg">Your order was delivered!</p>
          <p className="text-sm opacity-80">We hope you enjoyed your brew ☕</p>
        </div>
      )}

      {/* BrewPoints earned banner */}
      {(order.pointsEarned ?? 0) > 0 && (
        <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-bold">+{order.pointsEarned} BrewPoints</span>{" "}
            earned on this order
            {(order.pointsRedeemed ?? 0) > 0 && (
              <span className="text-amber-700">
                {" "}
                · {order.pointsRedeemed} pts redeemed (₹
                {Math.floor((order.pointsRedeemed ?? 0) / 10)} off)
              </span>
            )}
          </p>
        </div>
      )}

      {/* Progress steps */}
      <div className="mx-4 mt-4 bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Order Progress</h2>
          {liveConnected && isActive && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping inline-block" />
              Live
            </span>
          )}
        </div>
        <div className="relative">
          {order.status !== "cancelled" &&
            STEPS.map((step, i) => {
              const done = i <= currentIdx;
              const active = i === currentIdx;
              return (
                <div
                  key={step.key}
                  className="flex items-start gap-4 pb-6 last:pb-0"
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {step.icon}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div
                        className={`w-0.5 mt-1 transition-all duration-700 ${done && i < currentIdx ? "bg-primary" : "bg-border"}`}
                        style={{ minHeight: 24 }}
                      />
                    )}
                  </div>
                  <div className="pt-1.5 flex-1">
                    <p
                      className={`font-bold text-sm transition-colors ${done ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {step.label}
                    </p>
                    {active && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {step.desc}
                      </p>
                    )}
                  </div>
                  {active && isActive && (
                    <span className="mt-2 inline-flex w-2.5 h-2.5 rounded-full bg-accent animate-pulse shrink-0" />
                  )}
                </div>
              );
            })}
          {order.status === "cancelled" && (
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center">
                <span className="font-bold">!</span>
              </div>
              <p className="font-bold">Order Cancelled</p>
            </div>
          )}
        </div>
      </div>

      {/* Delivery address */}
      <div className="mx-4 mt-4 bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-accent" />
          <h2 className="font-bold">Delivering to</h2>
        </div>
        <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
      </div>

      {/* Order items */}
      <div className="mx-4 mt-4 bg-card border border-border rounded-2xl p-4">
        <h2 className="font-bold mb-3">Your Order</h2>
        <div className="space-y-2">
          {(
            order.items as Array<{
              name: string;
              quantity: number;
              price: number;
              imageUrl: string;
            }>
          ).map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-10 h-10 object-cover rounded-lg"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {item.quantity}× {item.name}
                </p>
              </div>
              <p className="text-sm font-bold">
                ₹{(item.price * item.quantity).toFixed(0)}
              </p>
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
          <div className="flex justify-between font-bold">
            <span>Total paid</span>
            <span>₹{order.total.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Demo simulate button */}
      {isActive && nextStatus && (
        <div className="mx-4 mt-4">
          <button
            onClick={handleAdvanceStatus}
            disabled={updateStatus.isPending}
            className="w-full border-2 border-primary text-primary font-bold py-3 rounded-xl hover:bg-primary/5 transition-colors disabled:opacity-60 text-sm"
          >
            {updateStatus.isPending
              ? "Updating…"
              : `Simulate: Move to "${nextStatus.replace(/_/g, " ")}"`}
          </button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Status pushes live to all connected clients via SSE
          </p>
        </div>
      )}
    </div>
  );
}
