import { useState } from "react";
import { Link } from "wouter";
import { useListCafes, getListCafesQueryKey } from "@workspace/api-client-react";
import { MapPin, Star, Clock, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const AREAS = ["All", "Koramangala", "Indiranagar", "HSR Layout", "MG Road", "Jayanagar", "Whitefield", "Marathahalli"];
const CATEGORIES = ["All", "coffee", "tea", "smoothie", "mojito", "beverage"];
const SORT_OPTIONS = [
  { value: "rating", label: "Top Rated" },
  { value: "deliveryTime", label: "Fastest" },
  { value: "popularity", label: "Most Popular" },
];

export default function Cafes() {
  const [area, setArea] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("popularity");

  const params = {
    ...(area ? { area } : {}),
    ...(category ? { category } : {}),
    ...(sortBy ? { sortBy: sortBy as "rating" | "deliveryTime" | "popularity" } : {}),
  };

  const { data: cafes, isLoading } = useListCafes(params, {
    query: { queryKey: getListCafesQueryKey(params) },
  });

  return (
    <div className="pb-8">
      <header className="bg-primary text-primary-foreground px-4 pt-6 pb-5 sticky top-0 z-10">
        <h1 className="text-2xl font-bold mb-4">Browse Cafes</h1>
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {AREAS.map((a) => (
            <button
              key={a}
              onClick={() => setArea(a === "All" ? "" : a)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                (a === "All" && !area) || area === a
                  ? "bg-accent text-accent-foreground border-transparent"
                  : "bg-white/10 text-primary-foreground/80 border-white/20"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4 flex gap-2 overflow-x-auto hide-scrollbar border-b border-border">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c === "All" ? "" : c)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              (c === "All" && !category) || category === c
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-muted text-muted-foreground border-transparent hover:bg-muted/70"
            }`}
          >
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
        <div className="ml-auto shrink-0 flex items-center gap-1">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs font-semibold bg-transparent text-foreground border-none outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : !cafes || cafes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">☕</p>
            <p className="font-bold text-lg">No cafes found</p>
            <p className="text-muted-foreground text-sm mt-1">Try changing your filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground font-medium">{cafes.length} cafes available</p>
            {cafes.map((cafe) => (
              <Link key={cafe.id} href={`/cafes/${cafe.id}`}>
                <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                  <div className="relative h-44">
                    <img src={cafe.imageUrl} alt={cafe.name} className="w-full h-full object-cover" />
                    {!cafe.isOpen && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">Closed</span>
                      </div>
                    )}
                    {cafe.discount && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded-lg">
                          {cafe.discount}
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {cafe.deliveryTime}m
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-base">{cafe.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-sm">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{cafe.area}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {cafe.categories.map((cat: string) => (
                            <span key={cat} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">{cat}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1 bg-green-600 text-white text-sm font-bold px-2 py-0.5 rounded-lg">
                          <Star className="w-3.5 h-3.5 fill-white" />
                          {cafe.rating}
                        </div>
                        <span className="text-xs text-muted-foreground">{cafe.reviewCount} reviews</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border text-xs text-muted-foreground font-medium">
                      <span>Min. ₹{cafe.minOrder}</span>
                      <span>•</span>
                      <span>Delivery ₹{cafe.deliveryFee}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
