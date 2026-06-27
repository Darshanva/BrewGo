import { useEffect, useRef, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Wifi, WifiOff, Clock, ChefHat, Bike, CheckCircle, Package,
  AlertCircle, RefreshCw, Bell,
} from "lucide-react";

type OrderItem = { name: string; quantity: number; price: number };

type AdminOrder = {
  id: number;
  userId: string | null;
  cafeId: number;
  cafeName: string;
  items: OrderItem[];
  status: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  deliveryAddress: string;
  estimatedTime: number;
  pointsEarned: number;
  pointsRedeemed: number;
  createdAt: string;
  updatedAt: string | null;
};

const STATUS_ORDER = ["placed", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"] as const;
type OrderStatus = typeof STATUS_ORDER[number];

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode; next: string | null }> = {
  placed:           { label: "New Order",     color: "text-red-700",    bg: "bg-red-50 border-red-200",    icon: <Bell className="w-4 h-4" />,        next: "confirmed" },
  confirmed:        { label: "Confirmed",     color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",  icon: <CheckCircle className="w-4 h-4" />, next: "preparing" },
  preparing:        { label: "Preparing",     color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: <ChefHat className="w-4 h-4" />,  next: "out_for_delivery" },
  out_for_delivery: { label: "Out for Delivery", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: <Bike className="w-4 h-4" />, next: "delivered" },
  delivered:        { label: "Delivered",     color: "text-green-700",  bg: "bg-green-50 border-green-200", icon: <CheckCircle className="w-4 h-4" />, next: null },
  cancelled:        { label: "Cancelled",     color: "text-gray-500",   bg: "bg-gray-50 border-gray-200",  icon: <AlertCircle className="w-4 h-4" />,  next: null },
};

const NEXT_ACTION: Record<string, string> = {
  placed: "Confirm",
  confirmed: "Start Preparing",
  preparing: "Mark Out for Delivery",
  out_for_delivery: "Mark Delivered",
};

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function OrderCard({
  order,
  isNew,
  onAdvance,
  advancing,
}: {
  order: AdminOrder;
  isNew: boolean;
  onAdvance: (id: number, next: string) => void;
  advancing: boolean;
}) {
  const meta = STATUS_META[order.status] ?? STATUS_META.placed;
  const nextStatus = meta.next;

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-500 ${meta.bg} ${isNew ? "ring-2 ring-red-400 ring-offset-1 animate-[pulse_1s_ease_2]" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-white/70 ${meta.color}`}>
            {meta.icon} {meta.label}
          </span>
          {isNew && (
            <span className="text-xs font-bold text-red-600 animate-bounce">NEW</span>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-lg">₹{order.total.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">{timeAgo(order.createdAt)}</p>
        </div>
      </div>

      <div className="mb-2">
        <p className="font-bold">{order.cafeName} · #{order.id}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">📍 {order.deliveryAddress}</p>
      </div>

      <div className="space-y-1 mb-3">
        {order.items.map((item, i) => (
          <p key={i} className="text-sm">
            <span className="font-semibold">{item.quantity}×</span> {item.name}
          </p>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" /> Est. {order.estimatedTime} min
        </span>
        {order.pointsEarned > 0 && (
          <span className="text-amber-600 font-medium">+{order.pointsEarned} pts</span>
        )}
        {order.discount > 0 && (
          <span className="text-green-600 font-medium">₹{order.discount.toFixed(0)} discount</span>
        )}
      </div>

      {nextStatus && NEXT_ACTION[order.status] && (
        <button
          onClick={() => onAdvance(order.id, nextStatus)}
          disabled={advancing}
          className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 text-sm"
        >
          {advancing ? (
            <span className="flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Updating…
            </span>
          ) : (
            `→ ${NEXT_ACTION[order.status]}`
          )}
        </button>
      )}
    </div>
  );
}

const ACTIVE_STATUSES = new Set(["placed", "confirmed", "preparing", "out_for_delivery"]);

export default function Admin() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
  const [advancing, setAdvancing] = useState<Record<number, boolean>>({});
  const [liveConnected, setLiveConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const { toast } = useToast();
  const closedRef = useRef(false);

  const fetchOrders = useCallback(async () => {
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
    const res = await fetch(`${baseUrl}/api/admin/orders`);
    if (res.ok) {
      const data = await res.json() as AdminOrder[];
      setOrders(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // SSE connection for live updates
  useEffect(() => {
    closedRef.current = false;
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
    const es = new EventSource(`${baseUrl}/api/admin/orders/stream`);

    es.onopen = () => { if (!closedRef.current) setLiveConnected(true); };
    es.onerror = () => { if (!closedRef.current) setLiveConnected(false); };

    es.addEventListener("new_order", (e: MessageEvent) => {
      if (closedRef.current) return;
      try {
        const newOrder = JSON.parse(e.data) as AdminOrder;
        setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
        setNewOrderIds((prev) => {
          const next = new Set(prev);
          next.add(newOrder.id);
          return next;
        });
        // Clear "new" highlight after 8 seconds
        setTimeout(() => {
          setNewOrderIds((prev) => {
            const next = new Set(prev);
            next.delete(newOrder.id);
            return next;
          });
        }, 8000);
        toast({
          title: `🛎️ New order #${newOrder.id} from ${newOrder.cafeName}!`,
          description: `${newOrder.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")} · ₹${newOrder.total.toFixed(0)}`,
          duration: 6000,
        });
      } catch {
        // ignore
      }
    });

    es.addEventListener("order_update", (e: MessageEvent) => {
      if (closedRef.current) return;
      try {
        const update = JSON.parse(e.data) as { id: number; status: string };
        setOrders((prev) =>
          prev.map((o) => (o.id === update.id ? { ...o, status: update.status } : o))
        );
      } catch {
        // ignore
      }
    });

    return () => {
      closedRef.current = true;
      es.close();
      setLiveConnected(false);
    };
  }, []);

  async function handleAdvance(orderId: number, nextStatus: string) {
    setAdvancing((p) => ({ ...p, [orderId]: true }));
    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      await fetch(`${baseUrl}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });
      // SSE will push the update; optimistically update local state too
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
    } catch {
      toast({ title: "Failed to update order status", variant: "destructive" });
    } finally {
      setAdvancing((p) => ({ ...p, [orderId]: false }));
    }
  }

  const displayOrders = filter === "active"
    ? orders.filter((o) => ACTIVE_STATUSES.has(o.status))
    : orders;

  const activeCount = orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;
  const countByStatus = (s: string) => orders.filter((o) => o.status === s).length;

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-bold text-2xl">Live Orders</h1>
            <p className="text-sm text-muted-foreground">Cafe operator dashboard</p>
          </div>
          <div className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-full ${liveConnected ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
            {liveConnected
              ? <><span className="w-2 h-2 rounded-full bg-green-500 animate-ping inline-block" /> LIVE</>
              : <><WifiOff className="w-3 h-3" /> Offline</>
            }
          </div>
        </div>

        {/* Status stats row */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { key: "placed", label: "New", color: "text-red-600 bg-red-50" },
            { key: "confirmed", label: "Confirmed", color: "text-blue-600 bg-blue-50" },
            { key: "preparing", label: "Preparing", color: "text-yellow-600 bg-yellow-50" },
            { key: "out_for_delivery", label: "En Route", color: "text-purple-600 bg-purple-50" },
          ].map(({ key, label, color }) => (
            <div key={key} className={`rounded-xl px-2 py-2 text-center ${color}`}>
              <p className="font-bold text-xl">{countByStatus(key)}</p>
              <p className="text-[10px] font-semibold leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("active")}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${filter === "active" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
          >
            All Orders ({orders.length})
          </button>
        </div>
      </div>

      {/* Order list */}
      <div className="px-4 pt-4 space-y-3">
        {loading && (
          <div className="text-center py-12 text-muted-foreground">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-40" />
            <p>Loading orders…</p>
          </div>
        )}

        {!loading && displayOrders.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
            <p className="font-bold text-lg text-muted-foreground">
              {filter === "active" ? "No active orders right now" : "No orders yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {liveConnected ? "New orders will appear here in real time" : "Connecting to live feed…"}
            </p>
          </div>
        )}

        {displayOrders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            isNew={newOrderIds.has(order.id)}
            onAdvance={handleAdvance}
            advancing={!!advancing[order.id]}
          />
        ))}
      </div>
    </div>
  );
}
