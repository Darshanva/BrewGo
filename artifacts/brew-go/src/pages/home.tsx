import { useGetFeatured, useGetTrending, getGetFeaturedQueryKey, getGetTrendingQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { MapPin, Search, Star, Clock, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { data: featured, isLoading: featuredLoading } = useGetFeatured({
    query: { queryKey: getGetFeaturedQueryKey() }
  });

  const { data: trending, isLoading: trendingLoading } = useGetTrending({
    query: { queryKey: getGetTrendingQueryKey() }
  });

  return (
    <div className="pb-8">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-6 rounded-b-3xl shadow-md sticky top-0 z-10 md:rounded-none">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/70 font-medium uppercase tracking-wider">Delivering to</p>
              <p className="font-bold text-lg flex items-center gap-1">
                Koramangala <ChevronRight className="w-4 h-4 opacity-50" />
              </p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold">JD</div>
        </div>
        
        <Link href="/search" className="bg-white/10 hover:bg-white/20 transition-colors border border-white/20 rounded-xl px-4 py-3 flex items-center gap-3 text-primary-foreground/80 backdrop-blur-sm">
          <Search className="w-5 h-5" />
          <span>Search for "Cold Brew"...</span>
        </Link>
      </header>

      {/* Categories */}
      <section className="px-4 py-6">
        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x">
          {['Coffee', 'Tea', 'Smoothie', 'Mojito', 'Beverage'].map((cat, i) => (
            <Link key={cat} href={`/search?category=${cat.toLowerCase()}`} className="snap-start flex flex-col items-center gap-2 shrink-0">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-sm ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}`}>
                <span className="font-bold text-xl">{cat[0]}</span>
              </div>
              <span className="text-xs font-semibold">{cat}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Cafes */}
      <section className="px-4 py-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold tracking-tight">Featured Roasters</h2>
          <Link href="/cafes" className="text-sm font-bold text-primary flex items-center">
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {featuredLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-64 shrink-0 space-y-3">
                <Skeleton className="w-full h-36 rounded-2xl" />
                <Skeleton className="w-3/4 h-5" />
                <Skeleton className="w-1/2 h-4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
            {featured?.featuredCafes.map(cafe => (
              <Link key={cafe.id} href={`/cafes/${cafe.id}`} className="block w-64 shrink-0 snap-start group">
                <div className="relative h-36 rounded-2xl overflow-hidden mb-3">
                  <img src={cafe.imageUrl} alt={cafe.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  {cafe.discount && (
                    <div className="absolute top-2 left-2 bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded-md">
                      {cafe.discount}
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm text-foreground text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                    <Clock className="w-3 h-3 text-primary" /> {cafe.deliveryTime}m
                  </div>
                </div>
                <h3 className="font-bold text-lg truncate">{cafe.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1 text-foreground font-semibold bg-primary/10 px-1.5 rounded text-primary">
                    <Star className="w-3 h-3 fill-primary" /> {cafe.rating}
                  </span>
                  <span className="truncate">{cafe.categories.join(", ")}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Trending Items */}
      <section className="px-4 py-6">
        <h2 className="text-xl font-bold tracking-tight mb-4">Trending in Bangalore</h2>
        
        {trendingLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 items-center">
                <Skeleton className="w-20 h-20 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-full h-5" />
                  <Skeleton className="w-1/3 h-4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {trending?.popularItems.slice(0, 5).map(item => (
              <Link key={item.id} href={`/cafes/${item.cafeId}`} className="flex gap-4 items-center bg-card p-3 rounded-2xl shadow-sm border border-border/50">
                <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-xl object-cover bg-muted" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h4 className="font-bold truncate pr-2">{item.name}</h4>
                    <span className="font-bold text-primary">₹{item.price}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mb-2">{item.cafeName}</p>
                  <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider">{item.category}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
