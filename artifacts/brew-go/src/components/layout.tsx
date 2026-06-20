import { Link, useLocation } from "wouter";
import { Coffee, Search, ShoppingBag, Receipt } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { items } = useCart();
  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background pb-[72px] md:pb-0 md:pl-64">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-card border-r border-border">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">B</div>
            <span className="font-bold text-2xl tracking-tight text-foreground">BrewGo</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem href="/" icon={<Coffee className="w-5 h-5" />} label="Home" active={location === "/"} />
          <NavItem href="/search" icon={<Search className="w-5 h-5" />} label="Search" active={location === "/search"} />
          <NavItem href="/orders" icon={<Receipt className="w-5 h-5" />} label="Orders" active={location.startsWith("/orders")} />
        </nav>

        <div className="p-4">
          <Link href="/cart" className="flex items-center justify-between w-full bg-primary text-primary-foreground p-4 rounded-xl hover:bg-primary/90 transition-colors">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5" />
              <span className="font-medium">Cart</span>
            </div>
            {cartItemCount > 0 && (
              <span className="bg-background text-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full max-w-3xl mx-auto">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-card border-t border-border flex items-center justify-around px-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <MobileNavItem href="/" icon={<Coffee />} label="Home" active={location === "/"} />
        <MobileNavItem href="/search" icon={<Search />} label="Search" active={location === "/search"} />
        <MobileNavItem href="/orders" icon={<Receipt />} label="Orders" active={location.startsWith("/orders")} />
        <Link href="/cart" className={`flex flex-col items-center justify-center w-16 h-16 relative ${location === "/cart" ? "text-primary" : "text-muted-foreground"}`}>
          <div className="relative">
            <ShoppingBag className={`w-6 h-6 mb-1 ${location === "/cart" ? "fill-primary/20" : ""}`} />
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-card">
                {cartItemCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Cart</span>
        </Link>
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${active ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground hover:bg-muted font-medium hover:text-foreground"}`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function MobileNavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center w-16 h-16 ${active ? "text-primary" : "text-muted-foreground"}`}>
      <div className={`mb-1 transition-transform ${active ? "scale-110" : ""}`}>
        {icon}
      </div>
      <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>{label}</span>
    </Link>
  );
}
