import { Link, useLocation } from "wouter";
import { Coffee, Search, ShoppingBag, Receipt, User, LayoutDashboard } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@workspace/replit-auth-web";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { items } = useCart();
  const { user, isAuthenticated, login } = useAuth();
  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0);

  const displayName = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

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
          <NavItem href="/profile" icon={<User className="w-5 h-5" />} label="Profile & Rewards" active={location === "/profile"} />
          <NavItem href="/admin" icon={<LayoutDashboard className="w-5 h-5" />} label="Admin Panel" active={location === "/admin"} />
        </nav>

        {/* Auth + Cart */}
        <div className="p-4 space-y-3">
          {!isAuthenticated ? (
            <button
              onClick={login}
              className="w-full flex items-center justify-center gap-2 bg-accent text-accent-foreground font-bold py-3 rounded-xl hover:bg-accent/90 transition-colors"
            >
              <User className="w-4 h-4" />
              Log in to earn rewards
            </button>
          ) : (
            <Link href="/profile">
              <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-xl hover:bg-muted/70 transition-colors cursor-pointer">
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {displayName}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">
                    {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Profile"}
                  </p>
                  <p className="text-xs text-muted-foreground">View rewards</p>
                </div>
              </div>
            </Link>
          )}

          <Link href="/cart" className="flex items-center justify-between w-full bg-primary text-primary-foreground p-4 rounded-xl hover:bg-primary/90 transition-colors">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5" />
              <span className="font-medium">Cart</span>
            </div>
            {cartItemCount > 0 && (
              <span className="bg-accent text-accent-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
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
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center w-16 h-16 ${location === "/profile" ? "text-primary" : "text-muted-foreground"}`}
        >
          {isAuthenticated && user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt="avatar" className="w-6 h-6 rounded-full object-cover mb-1" />
          ) : (
            <User className={`w-6 h-6 mb-1 ${location === "/profile" ? "fill-primary/20" : ""}`} />
          )}
          <span className="text-[10px] font-medium">{isAuthenticated ? "Profile" : "Sign in"}</span>
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
