import { useGetFeatured, useGetTrending, getGetFeaturedQueryKey, getGetTrendingQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { MapPin, Search, Star, Clock, ChevronRight, Tag, Flame, Coffee, Wind, Leaf, Droplets, Blend } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { useAuth } from "@workspace/replit-auth-web";

const CATEGORIES = [
  { label: "Coffee", slug: "coffee", icon: <Coffee className="w-5 h-5" /> },
  { label: "Tea", slug: "tea", icon: <Leaf className="w-5 h-5" /> },
  { label: "Cold Brew", slug: "cold-brew", icon: <Wind className="w-5 h-5" /> },
  { label: "Smoothie", slug: "smoothie", icon: <Blend className="w-5 h-5" /> },
  { label: "Mojito", slug: "mojito", icon: <Droplets className="w-5 h-5" /> },
];

export default function Home() {
  const { user } = useAuth();
  const [deliveryLocation, setDeliveryLocation] = useState("Bangalore");
  const [bannerIdx, setBannerIdx] = useState(0);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`
          )
            .then((r) => r.json())
            .then((d) => setDeliveryLocation(d.city || d.locality || d.principalSubdivision || "Bangalore"))
            .catch(() => {});
        },
        () => setDeliveryLocation("Koramangala")
      );
    }
  }, []);

  const { data: featured, isLoading: featuredLoading } = useGetFeatured({
    query: { queryKey: getGetFeaturedQueryKey() },
  });
  const { data: trending, isLoading: trendingLoading } = useGetTrending({
    query: { queryKey: getGetTrendingQueryKey() },
  });

  const banners = featured?.banners ?? [];

  // Auto-advance banner
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : "JD";

  return (
    <div className="pb-8">
      {/* Sticky header */}
      <header className="bg-primary text-primary-foreground p-5 pb-4 rounded-b-3xl shadow-md sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-[10px] text-primary-foreground/60 font-medium uppercase tracking-wider">
                Delivering to
              </p>
              <p className="font-bold flex items-center gap-1">
                {deliveryLocation} <ChevronRight className="w-3 h-3 opacity-50" />
              </p>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold">
            {initials}
          </div>
        </div>

        <Link
          href="/search"
          className="bg-white/10 hover:bg-white/20 transition-colors border border-white/20 rounded-xl px-4 py-3 flex items-center gap-3 text-primary-foreground/75 backdrop-blur-sm"
        >
          <Search className="w-4 h-4" />
          <span className="text-sm">Search for "Cold Brew"…</span>
        </Link>
      </header>

      {/* Hero banners */}
      <section className="mt-4 mx-4">
        {featuredLoading ? (
          <Skeleton className="h-44 rounded-2xl" />
        ) : banners.length > 0 ? (
          <div className="relative overflow-hidden rounded-2xl">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${bannerIdx * 100}%)` }}
            >
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="min-w-full h-44 relative flex-shrink-0 rounded-2xl overflow-hidden"
                  style={{ backgroundColor: b.color }}
                >
                  <img
                    src={b.imageUrl}
                    alt={b.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-40"
                  />
                  <div className="absolute inset-0 p-5 flex flex-col justify-end">
                    <p className="text-white font-bold text-lg leading-tight">{b.title}</p>
                    <p className="text-white/80 text-sm mt-1">{b.subtitle}</p>
                    {b.ctaText && (
                      <span className="mt-3 self-start bg-white text-primary text-xs font-bold px-4 py-1.5 rounded-full">
                        {b.ctaText}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* Dots */}
            {banners.length > 1 && (
              <div className="absolute bottom-3 right-4 flex gap-1">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setBannerIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === bannerIdx ? "bg-white w-4" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* Category shortcuts */}
      <section className="mt-5 px-4">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          What are you craving?
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/cafes?category=${cat.slug}`}
              className="flex flex-col items-center gap-1.5 min-w-[64px]"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/10 hover:bg-accent/20 transition-colors flex items-center justify-center text-primary">
                {cat.icon}
              </div>
              <span className="text-xs font-medium text-center">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Offers strip */}
      {(featured?.offers?.length ?? 0) > 0 && (
        <section className="mt-5 px-4">
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {featured!.offers.map((o) => (
              <div
                key={o.id}
                className="min-w-[180px] bg-primary/5 border border-primary/15 rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm">{o.discount}</p>
                  <p className="text-xs text-muted-foreground">{o.description}</p>
                  <p className="text-[10px] font-mono font-bold text-primary mt-0.5">{o.code}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured cafes */}
      <section className="mt-6 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" /> Featured Cafes
          </h2>
          <Link href="/cafes" className="text-xs text-primary font-semibold flex items-center gap-0.5">
            See all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {featuredLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="min-w-[220px] h-52 rounded-2xl flex-shrink-0" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {(featured?.featuredCafes ?? []).map((cafe) => (
              <Link
                key={cafe.id}
                href={`/cafes/${cafe.id}`}
                className="min-w-[220px] flex-shrink-0 bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative h-32">
                  <img
                    src={cafe.imageUrl ?? ""}
                    alt={cafe.name}
                    className="w-full h-full object-cover"
                  />
                  {cafe.discount && (
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-2">
                      {cafe.discount}
                    </Badge>
                  )}
                  {!cafe.isOpen && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">Closed</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-bold text-sm truncate">{cafe.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{cafe.area}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5 font-medium text-foreground">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {Number(cafe.rating).toFixed(1)}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> {cafe.deliveryTime} min
                    </span>
                    <span>·</span>
                    <span>₹{cafe.deliveryFee} delivery</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Trending popular items */}
      <section className="mt-6 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-500" /> Trending Now
          </h2>
        </div>

        {trendingLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {(trending?.popularItems ?? []).slice(0, 6).map((item) => (
              <Link
                key={item.id}
                href={`/cafes/${item.cafeId}`}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative h-28">
                  <img
                    src={item.imageUrl ?? "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400"}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2.5">
                  <p className="font-semibold text-xs truncate">{item.name}</p>
                  <p className="text-primary font-bold text-xs mt-0.5">₹{Number(item.price).toFixed(0)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Top cafes from trending */}
      {(trending?.topCafes?.length ?? 0) > 0 && (
        <section className="mt-6 px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base">Top Rated Near You</h2>
            <Link href="/cafes" className="text-xs text-primary font-semibold flex items-center gap-0.5">
              See all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {(trending?.topCafes ?? []).slice(0, 4).map((cafe) => (
              <Link
                key={cafe.id}
                href={`/cafes/${cafe.id}`}
                className="bg-card border border-border rounded-2xl flex overflow-hidden hover:shadow-md transition-shadow"
              >
                <img
                  src={cafe.imageUrl ?? ""}
                  alt={cafe.name}
                  className="w-24 h-24 object-cover flex-shrink-0"
                />
                <div className="p-3 flex flex-col justify-center flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{cafe.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{cafe.area}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5 font-medium text-foreground">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {Number(cafe.rating).toFixed(1)}
                    </span>
                    <span>·</span>
                    <span>{cafe.deliveryTime} min</span>
                    <span>·</span>
                    <span>₹{cafe.minOrder} min</span>
                  </div>
                  {cafe.discount && (
                    <Badge variant="secondary" className="mt-1.5 self-start text-[10px] px-2 py-0">
                      {cafe.discount}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
