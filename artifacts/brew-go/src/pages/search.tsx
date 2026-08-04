import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useListCafes, useSearchMenuItems, getListCafesQueryKey, getSearchMenuItemsQueryKey } from "@workspace/api-client-react";
import { Search as SearchIcon, Star, Clock, Coffee, X, SlidersHorizontal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["coffee", "tea", "smoothie", "mojito", "beverage"];
const AREAS = ["Koramangala", "Indiranagar", "HSR Layout", "MG Road", "Jayanagar", "Whitefield", "Marathahalli"];
const SUGGESTIONS = ["Cold Brew", "Cappuccino", "Masala Chai", "Mango Smoothie", "Mojito", "Filter Coffee", "Iced Latte", "Green Tea"];

export default function Search() {
  const [q, setQ] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [area, setArea] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [maxDelivery, setMaxDelivery] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const { addItem, cafeId: cartCafeId } = useCart();
  const { toast } = useToast();

  const cafeParams = {
    search: q || undefined,
    area: area || undefined,
  };
  const itemParams = {
    q: q || undefined,
    category: activeCategory || undefined,
  };

  const { data: cafes, isLoading: cafesLoading } = useListCafes(cafeParams, {
    query: { queryKey: getListCafesQueryKey(cafeParams), enabled: q.length > 1 || !!area },
  });

  const { data: items, isLoading: itemsLoading } = useSearchMenuItems(itemParams, {
    query: { queryKey: getSearchMenuItemsQueryKey(itemParams), enabled: q.length > 1 || !!activeCategory },
  });

  const isSearching = q.length > 1 || !!activeCategory || !!area;

  const filteredCafes = useMemo(() => {
    if (!cafes) return [];
    return cafes.filter((c) => {
      if (minRating > 0 && Number(c.rating) < minRating) return false;
      if (maxDelivery > 0 && c.deliveryTime > maxDelivery) return false;
      return true;
    });
  }, [cafes, minRating, maxDelivery]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items;
  }, [items]);

  const activeFilterCount = [area, minRating > 0, maxDelivery > 0].filter(Boolean).length;

  function handleAdd(item: { id: number; cafeId: number; cafeName: string; name: string; price: number; imageUrl: string }) {
    if (cartCafeId && cartCafeId !== item.cafeId) {
      toast({ title: "Cart cleared", description: `Starting new order from ${item.cafeName}` });
    }
    addItem({
      menuItemId: item.id,
      cafeId: item.cafeId,
      cafeName: item.cafeName,
      name: item.name,
      price: item.price,
      quantity: 1,
      imageUrl: item.imageUrl,
    });
    toast({ title: `${item.name} added to cart` });
  }

  function clearFilters() {
    setArea("");
    setMinRating(0);
    setMaxDelivery(0);
    setActiveCategory("");
  }

  return (
    <div className="pb-8">
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-background z-10 border-b border-border">
        {/* Search input */}
        <div className="relative mb-3">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search cafes or drinks..."
            className="w-full bg-muted border border-border rounded-2xl pl-12 pr-12 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar mb-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? "" : cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Filter toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
              showFilters || activeFilterCount > 0
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-xs font-bold text-accent">
              Clear all
            </button>
          )}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-muted/50 rounded-2xl space-y-3">
            {/* Area */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1.5">Area</p>
              <div className="flex gap-1.5 flex-wrap">
                {AREAS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setArea(area === a ? "" : a)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      area === a ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground border border-border"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1.5">Min Rating</p>
              <div className="flex gap-1.5">
                {[0, 3.5, 4.0, 4.5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setMinRating(r)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                      minRating === r ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground border border-border"
                    }`}
                  >
                    {r === 0 ? "Any" : <><Star className="w-3 h-3 fill-current" />{r}+</>}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery time */}
            <div>
              <p className="text-xs font-bold text-muted-foreground mb-1.5">Max Delivery Time</p>
              <div className="flex gap-1.5">
                {[0, 20, 30, 45].map((t) => (
                  <button
                    key={t}
                    onClick={() => setMaxDelivery(t)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      maxDelivery === t ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground border border-border"
                    }`}
                  >
                    {t === 0 ? "Any" : `≤ ${t} min`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-4">
        {!isSearching ? (
          <div>
            {/* Suggestions */}
            <p className="text-sm font-bold text-muted-foreground mb-3">Popular searches</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setQ(s)}
                  className="px-3 py-2 bg-muted rounded-xl text-sm font-medium hover:bg-muted/70 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-bold text-lg">What are you craving?</p>
              <p className="text-muted-foreground text-sm mt-1">Search for cafes, coffees, teas, smoothies and more</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {cafesLoading || itemsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : (
              <>
                {filteredCafes.length > 0 && (
                  <div>
                    <h2 className="font-bold text-base mb-3">Cafes ({filteredCafes.length})</h2>
                    <div className="space-y-3">
                      {filteredCafes.map((cafe) => (
                        <Link key={cafe.id} href={`/cafes/${cafe.id}`}>
                          <div className="bg-card border border-border rounded-xl flex items-center gap-3 p-3 hover:shadow-sm transition-shadow cursor-pointer">
                            <img src={cafe.imageUrl} alt={cafe.name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{cafe.name}</p>
                              <p className="text-xs text-muted-foreground">{cafe.area}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1 text-xs font-bold text-green-600">
                                  <Star className="w-3 h-3 fill-green-600" />
                                  {cafe.rating}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {cafe.deliveryTime}m
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {filteredItems.length > 0 && (
                  <div>
                    <h2 className="font-bold text-base mb-3">Beverages ({filteredItems.length})</h2>
                    <div className="space-y-3">
                      {filteredItems.map((item) => (
                        <div key={item.id} className="bg-card border border-border rounded-xl flex items-center gap-3 p-3">
                          <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.cafeName}</p>
                            <p className="font-bold text-sm mt-1">₹{item.price}</p>
                          </div>
                          <button
                            onClick={() => handleAdd(item)}
                            className="shrink-0 border-2 border-primary text-primary font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            ADD
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredCafes.length === 0 && filteredItems.length === 0 && (
                  <div className="text-center py-12">
                    <p className="font-bold text-lg">No results found</p>
                    <p className="text-muted-foreground text-sm mt-1">Try different filters or search term</p>
                    <button onClick={clearFilters} className="mt-3 text-sm font-bold text-primary">
                      Clear filters
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}