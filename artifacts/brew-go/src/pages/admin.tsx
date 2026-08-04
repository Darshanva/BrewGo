import { useEffect, useRef, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  WifiOff, Clock, ChefHat, Bike, CheckCircle, Package,
  AlertCircle, RefreshCw, Bell, Search, X, ShieldOff,
  LayoutDashboard, Store, UtensilsCrossed, Plus, Trash2, Pencil,
  IndianRupee, ShoppingBag, TrendingUp,
} from "lucide-react";

type OrderItem = { name: string; quantity: number; price: number };
type AdminOrder = {
  id: number; cafeName: string; items: OrderItem[]; status: string;
  total: number; deliveryAddress: string; estimatedTime: number;
  pointsEarned: number; discount: number; createdAt: string;
};
type LocalUser = { id: string; email?: string | null; firstName?: string | null; isAdmin?: boolean };
type Cafe = {
  id: number; name: string; description: string | null; area: string; address: string;
  rating: string; deliveryTime: number; deliveryFee: string; minOrder: string;
  imageUrl: string; isOpen: boolean; isFeatured: boolean; discount: string | null;
};
type MenuItem = {
  id: number; cafeId: number; name: string; description: string | null;
  price: string; category: string; imageUrl: string;
  isAvailable: boolean; isVeg: boolean; isBestseller: boolean;
};
type Stats = {
  totalOrders: number; todayOrders: number; totalRevenue: number;
  todayRevenue: number; statusCounts: Record<string, number>;
  totalCafes: number; totalMenuItems: number; activeOrders: number;
};

const API_BASE = import.meta.env.VITE_API_URL || "";
const ACTIVE_STATUSES = new Set(["placed", "confirmed", "preparing", "out_for_delivery"]);

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode; next: string | null }> = {
  placed: { label: "New Order", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: <Bell className="w-4 h-4" />, next: "confirmed" },
  confirmed: { label: "Confirmed", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: <CheckCircle className="w-4 h-4" />, next: "preparing" },
  preparing: { label: "Preparing", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: <ChefHat className="w-4 h-4" />, next: "out_for_delivery" },
  out_for_delivery: { label: "Out for Delivery", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: <Bike className="w-4 h-4" />, next: "delivered" },
  delivered: { label: "Delivered", color: "text-green-700", bg: "bg-green-50 border-green-200", icon: <CheckCircle className="w-4 h-4" />, next: null },
  cancelled: { label: "Cancelled", color: "text-gray-500", bg: "bg-gray-50 border-gray-200", icon: <AlertCircle className="w-4 h-4" />, next: null },
};
const NEXT_ACTION: Record<string, string> = {
  placed: "Confirm", confirmed: "Start Preparing",
  preparing: "Mark Out for Delivery", out_for_delivery: "Mark Delivered",
};

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

type Tab = "orders" | "dashboard" | "cafes";

export default function Admin() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCafeId, setSelectedCafeId] = useState<number | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
  const [advancing, setAdvancing] = useState<Record<number, boolean>>({});
  const [liveConnected, setLiveConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [search, setSearch] = useState("");
  const [showCafeForm, setShowCafeForm] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [cafeForm, setCafeForm] = useState({ name: "", area: "", address: "", description: "" });
  const [menuForm, setMenuForm] = useState({ name: "", price: "", category: "coffee", description: "" });
  const { toast } = useToast();
  const closedRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { setUser(null); }
    }
    setAuthLoading(false);
  }, []);

  const isAuthenticated = !!user;
  const isAdmin = isAuthenticated && !!user?.isAdmin;

  const fetchOrders = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/admin/orders`, { headers: authHeaders() });
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  }, []);

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/admin/stats`, { headers: authHeaders() });
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchCafes = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/admin/cafes`, { headers: authHeaders() });
    if (res.ok) setCafes(await res.json());
  }, []);

  const fetchMenu = useCallback(async (cafeId?: number) => {
    const url = cafeId ? `${API_BASE}/api/admin/menu?cafeId=${cafeId}` : `${API_BASE}/api/admin/menu`;
    const res = await fetch(url, { headers: authHeaders() });
    if (res.ok) setMenuItems(await res.json());
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetchOrders();
    fetchStats();
    fetchCafes();
  }, [isAdmin, fetchOrders, fetchStats, fetchCafes]);

  useEffect(() => {
    if (!isAdmin) return;
    closedRef.current = false;
    const es = new EventSource(`${API_BASE}/api/admin/orders/stream`);
    es.onopen = () => { if (!closedRef.current) setLiveConnected(true); };
    es.onerror = () => { if (!closedRef.current) setLiveConnected(false); };
    es.addEventListener("new_order", (e: MessageEvent) => {
      if (closedRef.current) return;
      try {
        const newOrder = JSON.parse(e.data) as AdminOrder;
        setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
        setNewOrderIds((prev) => new Set(prev).add(newOrder.id));
        setTimeout(() => setNewOrderIds((prev) => { const n = new Set(prev); n.delete(newOrder.id); return n; }), 8000);
        toast({ title: `🛎️ New order #${newOrder.id}`, description: `${newOrder.cafeName} · ₹${newOrder.total}` });
        fetchStats();
      } catch {}
    });
    return () => { closedRef.current = true; es.close(); setLiveConnected(false); };
  }, [isAdmin, toast, fetchStats]);

  async function handleAdvance(orderId: number, nextStatus: string) {
    setAdvancing((p) => ({ ...p, [orderId]: true }));
    try {
      await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
      fetchStats();
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setAdvancing((p) => ({ ...p, [orderId]: false }));
    }
  }

  async function createCafe() {
    if (!cafeForm.name || !cafeForm.area || !cafeForm.address) {
      toast({ title: "Name, area, address required", variant: "destructive" });
      return;
    }
    const res = await fetch(`${API_BASE}/api/admin/cafes`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(cafeForm),
    });
    if (res.ok) {
      toast({ title: "Cafe created!" });
      setShowCafeForm(false);
      setCafeForm({ name: "", area: "", address: "", description: "" });
      fetchCafes();
      fetchStats();
    } else {
      toast({ title: "Failed to create cafe", variant: "destructive" });
    }
  }

  async function toggleCafeOpen(cafe: Cafe) {
    await fetch(`${API_BASE}/api/admin/cafes/${cafe.id}`, {
      method: "PATCH", headers: authHeaders(),
      body: JSON.stringify({ isOpen: !cafe.isOpen }),
    });
    fetchCafes();
  }

  async function deleteCafe(id: number) {
    if (!confirm("Delete cafe and all its menu items?")) return;
    await fetch(`${API_BASE}/api/admin/cafes/${id}`, { method: "DELETE", headers: authHeaders() });
    fetchCafes();
    fetchMenu();
    fetchStats();
  }

  async function createMenuItem() {
    if (!selectedCafeId || !menuForm.name || !menuForm.price) {
      toast({ title: "Select cafe, name and price required", variant: "destructive" });
      return;
    }
    const res = await fetch(`${API_BASE}/api/admin/menu`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ ...menuForm, cafeId: selectedCafeId, price: Number(menuForm.price) }),
    });
    if (res.ok) {
      toast({ title: "Menu item added!" });
      setShowMenuForm(false);
      setMenuForm({ name: "", price: "", category: "coffee", description: "" });
      fetchMenu(selectedCafeId);
      fetchStats();
    } else {
      toast({ title: "Failed to add item", variant: "destructive" });
    }
  }

  async function deleteMenuItem(id: number) {
    if (!confirm("Delete this menu item?")) return;
    await fetch(`${API_BASE}/api/admin/menu/${id}`, { method: "DELETE", headers: authHeaders() });
    fetchMenu(selectedCafeId || undefined);
    fetchStats();
  }

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <ShieldOff className="w-16 h-16 text-muted-foreground/40 mb-4" />
        <h2 className="font-bold text-xl mb-2">Sign in required</h2>
        <Link href="/login"><button className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl">Sign in</button></Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <ShieldOff className="w-16 h-16 text-muted-foreground/40 mb-4" />
        <h2 className="font-bold text-xl mb-2">Access restricted</h2>
        <p className="text-sm text-muted-foreground">Admin only</p>
      </div>
    );
  }

  const displayOrders = (filter === "active" ? orders.filter((o) => ACTIVE_STATUSES.has(o.status)) : orders)
    .filter((o) => !search || o.cafeName.toLowerCase().includes(search.toLowerCase()) || String(o.id).includes(search));

  const filteredMenu = selectedCafeId ? menuItems.filter((m) => m.cafeId === selectedCafeId) : menuItems;

  return (
    <div className="pb-8">
      {/* Tabs */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-bold text-2xl">Admin</h1>
          <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full ${liveConnected ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
            {liveConnected ? <><span className="w-2 h-2 rounded-full bg-green-500 animate-ping" /> LIVE</> : <><WifiOff className="w-3 h-3" /> Offline</>}
          </div>
        </div>
        <div className="flex gap-2">
          {([
            { key: "orders" as Tab, label: "Orders", icon: <ShoppingBag className="w-4 h-4" /> },
            { key: "dashboard" as Tab, label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
            { key: "cafes" as Tab, label: "Cafes & Menu", icon: <Store className="w-4 h-4" /> },
          ]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── DASHBOARD ── */}
      {tab === "dashboard" && stats && (
        <div className="px-4 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border rounded-2xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold mb-1"><IndianRupee className="w-4 h-4" /> TODAY REVENUE</div>
              <p className="text-3xl font-bold text-primary">₹{stats.todayRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-card border rounded-2xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold mb-1"><TrendingUp className="w-4 h-4" /> TOTAL REVENUE</div>
              <p className="text-3xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-card border rounded-2xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold mb-1"><ShoppingBag className="w-4 h-4" /> TODAY ORDERS</div>
              <p className="text-3xl font-bold">{stats.todayOrders}</p>
            </div>
            <div className="bg-card border rounded-2xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold mb-1"><Package className="w-4 h-4" /> ACTIVE</div>
              <p className="text-3xl font-bold text-amber-600">{stats.activeOrders}</p>
            </div>
          </div>
          <div className="bg-card border rounded-2xl p-4">
            <p className="font-bold mb-3">Status Breakdown</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(stats.statusCounts).map(([status, count]) => (
                <div key={status} className="bg-muted rounded-xl p-3 text-center">
                  <p className="font-bold text-lg">{count}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{status.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border rounded-2xl p-4 text-center">
              <Store className="w-6 h-6 mx-auto mb-1 text-primary" />
              <p className="font-bold text-2xl">{stats.totalCafes}</p>
              <p className="text-xs text-muted-foreground">Cafes</p>
            </div>
            <div className="bg-card border rounded-2xl p-4 text-center">
              <UtensilsCrossed className="w-6 h-6 mx-auto mb-1 text-primary" />
              <p className="font-bold text-2xl">{stats.totalMenuItems}</p>
              <p className="text-xs text-muted-foreground">Menu Items</p>
            </div>
          </div>
        </div>
      )}

      {/* ── ORDERS ── */}
      {tab === "orders" && (
        <div className="px-4 pt-4 space-y-3">
          <div className="flex gap-2 mb-2">
            <button onClick={() => setFilter("active")} className={`flex-1 py-2 rounded-xl text-sm font-bold ${filter === "active" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>Active</button>
            <button onClick={() => setFilter("all")} className={`flex-1 py-2 rounded-xl text-sm font-bold ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>All</button>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders…" className="w-full pl-9 py-2.5 text-sm bg-muted rounded-xl outline-none" />
          </div>
          {loading && <div className="text-center py-12"><RefreshCw className="w-8 h-8 animate-spin mx-auto opacity-40" /></div>}
          {!loading && displayOrders.length === 0 && (
            <div className="text-center py-16"><Package className="w-16 h-16 mx-auto mb-4 opacity-30" /><p className="font-bold text-muted-foreground">No orders</p></div>
          )}
          {displayOrders.map((order) => {
            const meta = STATUS_META[order.status] ?? STATUS_META.placed;
            return (
              <div key={order.id} className={`rounded-2xl border p-4 ${meta.bg} ${newOrderIds.has(order.id) ? "ring-2 ring-red-400" : ""}`}>
                <div className="flex justify-between mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full bg-white/70 ${meta.color}`}>{meta.icon} {meta.label}</span>
                  <div className="text-right"><p className="font-bold">₹{order.total}</p><p className="text-xs text-muted-foreground">{timeAgo(order.createdAt)}</p></div>
                </div>
                <p className="font-bold text-sm">{order.cafeName} · #{order.id}</p>
                <p className="text-xs text-muted-foreground mb-2">📍 {order.deliveryAddress}</p>
                {order.items.map((item, i) => <p key={i} className="text-sm"><span className="font-semibold">{item.quantity}×</span> {item.name}</p>)}
                {meta.next && (
                  <button onClick={() => handleAdvance(order.id, meta.next!)} disabled={!!advancing[order.id]}
                    className="w-full mt-3 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
                    {advancing[order.id] ? "Updating…" : `→ ${NEXT_ACTION[order.status]}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── CAFES & MENU ── */}
      {tab === "cafes" && (
        <div className="px-4 pt-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">Cafes ({cafes.length})</h2>
            <button onClick={() => setShowCafeForm(!showCafeForm)} className="flex items-center gap-1 bg-primary text-primary-foreground text-sm font-bold px-3 py-2 rounded-xl">
              <Plus className="w-4 h-4" /> Add Cafe
            </button>
          </div>

          {showCafeForm && (
            <div className="bg-card border rounded-2xl p-4 space-y-3">
              <input placeholder="Cafe name *" value={cafeForm.name} onChange={(e) => setCafeForm({ ...cafeForm, name: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none" />
              <input placeholder="Area *" value={cafeForm.area} onChange={(e) => setCafeForm({ ...cafeForm, area: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none" />
              <input placeholder="Address *" value={cafeForm.address} onChange={(e) => setCafeForm({ ...cafeForm, address: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none" />
              <input placeholder="Description" value={cafeForm.description} onChange={(e) => setCafeForm({ ...cafeForm, description: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none" />
              <button onClick={createCafe} className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-xl">Create Cafe</button>
            </div>
          )}

          <div className="space-y-2">
            {cafes.map((cafe) => (
              <div key={cafe.id} className={`bg-card border rounded-2xl p-4 ${selectedCafeId === cafe.id ? "ring-2 ring-primary" : ""}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 cursor-pointer" onClick={() => { setSelectedCafeId(cafe.id); fetchMenu(cafe.id); }}>
                    <p className="font-bold">{cafe.name}</p>
                    <p className="text-xs text-muted-foreground">{cafe.area} · {cafe.address}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${cafe.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {cafe.isOpen ? "Open" : "Closed"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleCafeOpen(cafe)} className="text-xs font-bold px-2 py-1 rounded-lg bg-muted">{cafe.isOpen ? "Close" : "Open"}</button>
                    <button onClick={() => deleteCafe(cafe.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedCafeId && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold text-lg">Menu — {cafes.find((c) => c.id === selectedCafeId)?.name}</h2>
                <button onClick={() => setShowMenuForm(!showMenuForm)} className="flex items-center gap-1 bg-accent text-accent-foreground text-sm font-bold px-3 py-2 rounded-xl">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              </div>

              {showMenuForm && (
                <div className="bg-card border rounded-2xl p-4 space-y-3 mb-3">
                  <input placeholder="Item name *" value={menuForm.name} onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none" />
                  <input placeholder="Price *" type="number" value={menuForm.price} onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none" />
                  <select value={menuForm.category} onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })} className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none">
                    <option value="coffee">Coffee</option>
                    <option value="tea">Tea</option>
                    <option value="mojito">Mojito</option>
                    <option value="smoothie">Smoothie</option>
                    <option value="beverage">Beverage</option>
                  </select>
                  <button onClick={createMenuItem} className="w-full bg-primary text-primary-foreground font-bold py-2.5 rounded-xl">Add Item</button>
                </div>
              )}

              <div className="space-y-2">
                {filteredMenu.map((item) => (
                  <div key={item.id} className="bg-card border rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">₹{item.price} · {item.category}</p>
                    </div>
                    <button onClick={() => deleteMenuItem(item.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {filteredMenu.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No menu items yet</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}