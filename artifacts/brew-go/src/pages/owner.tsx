import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Store, Package, Clock, CheckCircle, ChefHat, Bike,
  AlertCircle, Bell, RefreshCw, Plus, Trash2, ShieldOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

type LocalUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  isAdmin?: boolean;
  cafeId?: number | null;
};

type OrderItem = { name: string; quantity: number; price: number };
type OwnerOrder = {
  id: number;
  cafeName: string;
  items: OrderItem[];
  status: string;
  total: number;
  deliveryAddress: string;
  estimatedTime: number;
  createdAt: string;
};

type MenuItem = {
  id: number;
  cafeId: number;
  name: string;
  price: string;
  category: string;
  isAvailable: boolean;
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; next: string | null; action: string }> = {
  placed: { label: "New", color: "text-red-700", bg: "bg-red-50 border-red-200", next: "confirmed", action: "Confirm" },
  confirmed: { label: "Confirmed", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", next: "preparing", action: "Start Preparing" },
  preparing: { label: "Preparing", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", next: "out_for_delivery", action: "Out for Delivery" },
  out_for_delivery: { label: "On the Way", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", next: "delivered", action: "Mark Delivered" },
  delivered: { label: "Delivered", color: "text-green-700", bg: "bg-green-50 border-green-200", next: null, action: "" },
  cancelled: { label: "Cancelled", color: "text-gray-500", bg: "bg-gray-50 border-gray-200", next: null, action: "" },
};

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function Owner() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OwnerOrder[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tab, setTab] = useState<"orders" | "menu">("orders");
  const [advancing, setAdvancing] = useState<Record<number, boolean>>({});
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [menuForm, setMenuForm] = useState({ name: "", price: "", category: "coffee" });
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setUser(u);
        if (!u.cafeId && !u.isAdmin) {
          // not an owner
        }
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const cafeId = user?.cafeId;
  const canAccess = !!cafeId || user?.isAdmin;

  const fetchOrders = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/admin/orders`, { headers: authHeaders() });
    if (res.ok) {
      const all: OwnerOrder[] = await res.json();
      // Owner sees only their cafe orders
      const filtered = cafeId ? all.filter((o: any) => o.cafeId === cafeId) : all;
      setOrders(filtered);
    }
  }, [cafeId]);

  const fetchMenu = useCallback(async () => {
    if (!cafeId) return;
    const res = await fetch(`${API_BASE}/api/admin/menu?cafeId=${cafeId}`, { headers: authHeaders() });
    if (res.ok) setMenu(await res.json());
  }, [cafeId]);

  useEffect(() => {
    if (!canAccess) return;
    fetchOrders();
    fetchMenu();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [canAccess, fetchOrders, fetchMenu]);

  async function handleAdvance(orderId: number, next: string) {
    setAdvancing((p) => ({ ...p, [orderId]: true }));
    try {
      await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: next }),
      });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: next } : o)));
      toast({ title: "Status updated" });
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    } finally {
      setAdvancing((p) => ({ ...p, [orderId]: false }));
    }
  }

  async function addMenuItem() {
    if (!cafeId || !menuForm.name || !menuForm.price) return;
    const res = await fetch(`${API_BASE}/api/admin/menu`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ...menuForm, cafeId, price: Number(menuForm.price) }),
    });
    if (res.ok) {
      toast({ title: "Item added" });
      setShowMenuForm(false);
      setMenuForm({ name: "", price: "", category: "coffee" });
      fetchMenu();
    }
  }

  async function deleteMenuItem(id: number) {
    if (!confirm("Delete item?")) return;
    await fetch(`${API_BASE}/api/admin/menu/${id}`, { method: "DELETE", headers: authHeaders() });
    fetchMenu();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <ShieldOff className="w-16 h-16 text-muted-foreground/40 mb-4" />
        <h2 className="font-bold text-xl mb-2">Sign in required</h2>
        <Link href="/login">
          <button className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl">Sign in</button>
        </Link>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <ShieldOff className="w-16 h-16 text-muted-foreground/40 mb-4" />
        <h2 className="font-bold text-xl mb-2">Cafe Owner access only</h2>
        <p className="text-sm text-muted-foreground">Your account is not linked to a cafe.</p>
      </div>
    );
  }

  const activeOrders = orders.filter((o) =>
    ["placed", "confirmed", "preparing", "out_for_delivery"].includes(o.status)
  );

  return (
    <div className="pb-8">
      <div className="px-4 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <Store className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-2xl">Cafe Owner</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage your cafe orders & menu</p>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setTab("orders")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${tab === "orders" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <Package className="w-4 h-4" /> Orders ({activeOrders.length})
          </button>
          <button
            onClick={() => setTab("menu")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${tab === "menu" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <Store className="w-4 h-4" /> Menu ({menu.length})
          </button>
        </div>
      </div>

      {tab === "orders" && (
        <div className="px-4 pt-4 space-y-3">
          {activeOrders.length === 0 && (
            <div className="text-center py-16">
              <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="font-bold text-muted-foreground">No active orders</p>
            </div>
          )}
          {activeOrders.map((order) => {
            const meta = STATUS_META[order.status] ?? STATUS_META.placed;
            return (
              <div key={order.id} className={`rounded-2xl border p-4 ${meta.bg}`}>
                <div className="flex justify-between mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full bg-white/70 ${meta.color}`}>
                    {meta.label}
                  </span>
                  <span className="font-bold">₹{order.total}</span>
                </div>
                <p className="font-bold text-sm">Order #{order.id}</p>
                <p className="text-xs text-muted-foreground mb-2">📍 {order.deliveryAddress}</p>
                {order.items.map((item, i) => (
                  <p key={i} className="text-sm">
                    <span className="font-semibold">{item.quantity}×</span> {item.name}
                  </p>
                ))}
                {meta.next && (
                  <button
                    onClick={() => handleAdvance(order.id, meta.next!)}
                    disabled={!!advancing[order.id]}
                    className="w-full mt-3 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl text-sm disabled:opacity-60"
                  >
                    {advancing[order.id] ? "Updating…" : `→ ${meta.action}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "menu" && (
        <div className="px-4 pt-4 space-y-3">
          <button
            onClick={() => setShowMenuForm(!showMenuForm)}
            className="flex items-center gap-1 bg-primary text-primary-foreground text-sm font-bold px-3 py-2 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>

          {showMenuForm && (
            <div className="bg-card border rounded-2xl p-4 space-y-3">
              <input
                placeholder="Item name"
                value={menuForm.name}
                onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none"
              />
              <input
                placeholder="Price"
                type="number"
                value={menuForm.price}
                onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none"
              />
              <select
                value={menuForm.category}
                onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none"
              >
                <option value="coffee">Coffee</option>
                <option value="tea">Tea</option>
                <option value="mojito">Mojito</option>
                <option value="smoothie">Smoothie</option>
                <option value="beverage">Beverage</option>
              </select>
              <button onClick={addMenuItem} className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-xl">
                Add
              </button>
            </div>
          )}

          {menu.map((item) => (
            <div key={item.id} className="bg-card border rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground">₹{item.price} · {item.category}</p>
              </div>
              <button onClick={() => deleteMenuItem(item.id)} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {menu.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No menu items yet</p>
          )}
        </div>
      )}
    </div>
  );
}