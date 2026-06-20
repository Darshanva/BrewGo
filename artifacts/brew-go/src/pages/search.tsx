import { useState } from "react";
import { Link } from "wouter";
import { useListCafes, useSearchMenuItems, getListCafesQueryKey, getSearchMenuItemsQueryKey } from "@workspace/api-client-react";
import { Search as SearchIcon, Star, Clock, Coffee } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["coffee", "tea", "smoothie", "mojito", "beverage"];

export default function Search() {
  const [q, setQ] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const { addItem, cafeId: cartCafeId } = useCart();
  const { toast } = useToast();

  const cafeParams = { search: q || undefined };
  const itemParams = { q: q || undefined, category: activeCategory || undefined };

  const { data: cafes, isLoading: cafesLoading } = useListCafes(cafeParams, {
    query: { queryKey: getListCafesQueryKey(cafeParams), enabled: q.length > 1 },
  });

  const { data: items, isLoading: itemsLoading } = useSearchMenuItems(itemParams, {
    query: { queryKey: getSearchMenuItemsQueryKey(itemParams), enabled: q.length > 1 || !!activeCategory },
  });

  const isSearching = q.length > 1 || !!activeCategory;

  function handleAdd(item: { id: number; cafeId: number; cafeName: string; name: string; price: number; imageUrl: string }) {
    if (cartCafeId && cartCafeId !== item.cafeId) {
      toast({ title: "Cart cleared", description: `Starting new order from ${item.cafeName}` });
    }
    addItem({ menuItemId: item.id, cafeId: item.cafeId, cafeName: item.cafeName, name: item.name, price: item.price, quantity: 1, imageUrl: item.imageUrl });
    toast({ title: `${item.name} added to cart` });
  }

  return (
    <div className="pb-8">
      <div className="px-4 pt-6 pb-4 sticky top-0 bg-background z-10 border-b border-border">
        <div className="relative mb-4">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search cafes or drinks...'
            className="w-full bg-muted border border-border rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
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
      </div>

      <div className="px-4 py-4">
        {!isSearching ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Coffee className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-bold text-lg">What are you craving?</p>
            <p className="text-muted-foreground text-sm mt-1">Search for cafes, coffees, teas, smoothies and more</p>
          </div>
        ) : (
          <div className="space-y-6">
            {cafesLoading || itemsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : (
              <>
                {cafes && cafes.length > 0 && (
                  <div>
                    <h2 className="font-bold text-base mb-3">Cafes</h2>
                    <div className="space-y-3">
                      {cafes.map((cafe) => (
                        <Link key={cafe.id} href={`/cafes/${cafe.id}`}>
                          <div className="bg-card border border-border rounded-xl flex items-center gap-3 p-3 hover:shadow-sm transition-shadow cursor-pointer">
                            <img src={cafe.imageUrl} alt={cafe.name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm truncate">{cafe.name}</p>
                              <p className="text-xs text-muted-foreground">{cafe.area}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1 text-xs font-bold text-green-600">
                                  <Star className="w-3 h-3 fill-green-600" />{cafe.rating}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />{cafe.deliveryTime}m
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {items && items.length > 0 && (
                  <div>
                    <h2 className="font-bold text-base mb-3">Beverages</h2>
                    <div className="space-y-3">
                      {items.map((item) => (
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

                {cafes?.length === 0 && items?.length === 0 && (
                  <div className="text-center py-12">
                    <p className="font-bold text-lg">No results found</p>
                    <p className="text-muted-foreground text-sm mt-1">Try searching for something else</p>
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
