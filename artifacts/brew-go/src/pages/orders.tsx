import { Link } from "wouter";
import { useListOrders, getListOrdersQueryKey } from "@workspace/api-client-react";
import { Receipt, Clock, CheckCircle, XCircle, ChevronRight, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  placed: { label: "Order Placed", color: "text-blue-600 bg-blue-50", icon: <Clock className="w-4 h-4" /> },
  confirmed: { label: "Confirmed", color: "text-indigo-600 bg-indigo-50", icon: <CheckCircle className="w-4 h-4" /> },
  preparing: { label: "Preparing", color: "text-amber-600 bg-amber-50", icon: <Package className="w-4 h-4" /> },
  out_for_delivery: { label: "On the way", color: "text-orange-600 bg-orange-50", icon: <Clock className="w-4 h-4" /> },
  delivered: { label: "Delivered", color: "text-green-600 bg-green-50", icon: <CheckCircle className="w-4 h-4" /> },
  cancelled: { label: "Cancelled", color: "text-red-600 bg-red-50", icon: <XCircle className="w-4 h-4" /> },
};

export default function Orders() {
  const { data: orders, isLoading } = useListOrders({
    query: { queryKey: getListOrdersQueryKey() },
  });

  return (
    <div className="pb-8">
      <div className="px-4 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold">Your Orders</h1>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-5">
              <Receipt className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="font-bold text-lg mb-2">No orders yet</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Your brew history will appear here
            </p>
            <Link href="/cafes">
              <span className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors">
                Order Now
              </span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.placed;
              const isActive = !["delivered", "cancelled"].includes(order.status);
              return (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <div className={`bg-card border rounded-xl p-4 cursor-pointer hover:shadow-sm transition-shadow ${isActive ? "border-primary/30" : "border-border"}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-base">{order.cafeName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Order #{order.id} • {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg ${cfg.color}`}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    </div>

                    <div className="text-sm text-muted-foreground mb-3">
                      {(order.items as Array<{ name: string; quantity: number }>)
                        .slice(0, 3)
                        .map((i) => `${i.quantity}x ${i.name}`)
                        .join(", ")}
                      {(order.items as Array<unknown>).length > 3 && ` +${(order.items as Array<unknown>).length - 3} more`}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="font-bold">₹{order.total.toFixed(0)}</span>
                      <div className="flex items-center gap-1 text-sm font-bold text-primary">
                        {isActive ? "Track Order" : "View Details"}
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
