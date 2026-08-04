import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
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
  const [, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
      setIsAuthenticated(true);
    } else {
      setLocation("/login");
    }
    setChecking(false);
  }, [setLocation]);

  const { data: orders, isLoading } = useListOrders({
    query: {
      queryKey: getListOrdersQueryKey(),
      enabled: isAuthenticated,
    },
  });

  if (checking || !isAuthenticated) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }

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
              <button className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors">
                Browse Cafes
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order: any) => {
              const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.placed;
              return (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <div className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </div>
                        <p className="font-bold text-sm truncate">
                          {order.cafeName || `Order #${order.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">₹{order.totalAmount ?? order.total ?? 0}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
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