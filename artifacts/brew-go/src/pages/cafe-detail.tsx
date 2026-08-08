import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetCafe, useGetCafeMenu, useGetCafeReviews, useCreateReview,
  getGetCafeQueryKey, getGetCafeMenuQueryKey, getGetCafeReviewsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCart } from "@/lib/cart-context";
import { MapPin, Star, Clock, ChevronLeft, Plus, Minus, ShoppingBag, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function CafeDetail() {
  const [, params] = useRoute("/cafes/:id");
  const id = Number(params?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { items: cartItems, addItem, updateQuantity, cafeId: cartCafeId, subtotal } = useCart();
  const [activeTab, setActiveTab] = useState("all");
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const { data: cafe, isLoading: cafeLoading } = useGetCafe(id, {
    query: { enabled: !!id, queryKey: getGetCafeQueryKey(id) },
  });
  const { data: menu, isLoading: menuLoading } = useGetCafeMenu(id, {
    query: { enabled: !!id, queryKey: getGetCafeMenuQueryKey(id) },
  });
  const { data: reviews } = useGetCafeReviews(id, {
    query: { enabled: !!id, queryKey: getGetCafeReviewsQueryKey(id) },
  });
  const createReview = useCreateReview();

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API_BASE}/api/favorites/check/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setIsFavorite(!!d.isFavorite))
      .catch(() => {});
  }, [id]);

  const filteredMenu =
    menu?.filter((item) => (activeTab === "all" ? true : item.category === activeTab)) ?? [];
  const menuCategories = [...new Set(menu?.map((i) => i.category) ?? [])];

  function getCartQty(menuItemId: number) {
    return cartItems.find((i) => i.menuItemId === menuItemId)?.quantity ?? 0;
  }

  function handleAdd(item: {
    id: number;
    cafeId: number;
    cafeName: string;
    name: string;
    price: number;
    imageUrl: string;
  }) {
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
  }

  async function toggleFavorite() {
    const token = localStorage.getItem("token");
    if (!token) {
      toast({ title: "Login to save favorites", variant: "destructive" });
      return;
    }
    setFavLoading(true);
    try {
      if (isFavorite) {
        await fetch(`${API_BASE}/api/favorites/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        setIsFavorite(false);
        toast({ title: "Removed from favorites" });
      } else {
        await fetch(`${API_BASE}/api/favorites`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ cafeId: id }),
        });
        setIsFavorite(true);
        toast({ title: "Added to favorites ❤️" });
      }
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    } finally {
      setFavLoading(false);
    }
  }

  function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;
    createReview.mutate(
      { id, data: { rating: reviewRating, comment: reviewComment, reviewerName: reviewName } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCafeReviewsQueryKey(id) });
          setReviewName("");
          setReviewComment("");
          setReviewRating(5);
          setShowReviewForm(false);
          toast({ title: "Review posted!" });
        },
      }
    );
  }

  if (cafeLoading) {
    return (
      <div className="pb-8">
        <Skeleton className="h-56 w-full" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    );
  }

  if (!cafe) return <div className="p-8 text-center text-muted-foreground">Cafe not found</div>;

  return (
    <div className="pb-40 md:pb-24">
      <div className="relative h-56">
        <img src={cafe.imageUrl} alt={cafe.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Link
            href="/cafes"
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <button
            onClick={toggleFavorite}
            disabled={favLoading}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors disabled:opacity-50"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
          </button>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-white font-bold text-2xl">{cafe.name}</h1>
              <div className="flex items-center gap-1.5 text-white/80 text-sm mt-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>
                  {cafe.area} • {cafe.address}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-green-500 text-white text-sm font-bold px-2 py-1 rounded-lg shrink-0">
              <Star className="w-3.5 h-3.5 fill-white" />
              {cafe.rating}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-border">
        {cafe.description && (
          <p className="text-muted-foreground text-sm mb-3">{cafe.description}</p>
        )}
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5">
            <Clock className="w-4 h-4 text-accent" />
            <span className="font-semibold">{cafe.deliveryTime} mins</span>
          </div>
          <div className="bg-muted rounded-lg px-3 py-1.5">
            <span className="font-semibold">₹{cafe.deliveryFee} delivery</span>
          </div>
          <div className="bg-muted rounded-lg px-3 py-1.5">
            <span className="font-semibold">Min ₹{cafe.minOrder}</span>
          </div>
          {cafe.discount && (
            <Badge className="bg-accent/10 text-accent border border-accent/20 font-semibold">
              {cafe.discount}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-3">
          {(cafe.categories as string[]).map((cat) => (
            <span
              key={cat}
              className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize font-medium"
            >
              {cat}
            </span>
          ))}
        </div>
      </div>

      <div className="sticky top-0 bg-background z-10 border-b border-border">
        <div className="flex gap-1 px-4 py-3 overflow-x-auto hide-scrollbar">
          {["all", ...menuCategories].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {menuLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredMenu.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No items in this category</div>
        ) : (
          <div className="space-y-3">
            {filteredMenu.map((item) => {
              const qty = getCartQty(item.id);
              return (
                <div key={item.id} className="bg-card border border-border rounded-xl overflow-hidden flex">
                  <div className="flex-1 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-3 h-3 rounded-sm border-2 ${
                          item.isVeg ? "border-green-600" : "border-red-500"
                        } flex items-center justify-center`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isVeg ? "bg-green-600" : "bg-red-500"
                          }`}
                        />
                      </div>
                      {item.isBestseller && (
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                          Bestseller
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <p className="font-bold text-base mt-2">₹{item.price}</p>
                  </div>
                  <div className="relative w-28 shrink-0">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                      {qty === 0 ? (
                        <button
                          onClick={() =>
                            handleAdd({
                              ...item,
                              cafeId: item.cafeId,
                              cafeName: item.cafeName,
                            })
                          }
                          disabled={!item.isAvailable}
                          className="bg-card text-primary border-2 border-primary font-bold text-sm px-4 py-1.5 rounded-lg shadow-md hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40"
                        >
                          ADD
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 bg-primary text-primary-foreground rounded-lg shadow-md px-1 py-1">
                          <button
                            onClick={() => updateQuantity(item.id, qty - 1)}
                            className="w-6 h-6 flex items-center justify-center"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-sm font-bold w-4 text-center">{qty}</span>
                          <button
                            onClick={() =>
                              handleAdd({
                                ...item,
                                cafeId: item.cafeId,
                                cafeName: item.cafeName,
                              })
                            }
                            className="w-6 h-6 flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Reviews {reviews && `(${reviews.length})`}</h2>
          <button
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="text-sm font-bold text-accent"
          >
            + Write a review
          </button>
        </div>
        {showReviewForm && (
          <form onSubmit={handleSubmitReview} className="bg-muted rounded-xl p-4 mb-4 space-y-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onClick={() => setReviewRating(s)}>
                  <Star
                    className={`w-6 h-6 ${
                      s <= reviewRating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            <input
              value={reviewName}
              onChange={(e) => setReviewName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience..."
              rows={3}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <button
              type="submit"
              disabled={createReview.isPending}
              className="w-full bg-primary text-primary-foreground font-bold py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {createReview.isPending ? "Posting..." : "Post Review"}
            </button>
          </form>
        )}
        {reviews && reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">{r.reviewerName}</span>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < Math.round(r.rating)
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{r.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground text-sm py-6">
            No reviews yet. Be the first!
          </p>
        )}
      </div>

      {cartItems.length > 0 && cartItems[0].cafeId === id && (
        <div className="fixed bottom-[72px] md:bottom-0 left-0 right-0 md:left-64 p-4 bg-background/80 backdrop-blur-md border-t border-border z-20">
          <Link href="/cart">
            <div className="bg-primary text-primary-foreground rounded-2xl px-5 py-4 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5" />
                <span className="font-bold">
                  {cartItems.reduce((s, i) => s + i.quantity, 0)} items
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg">₹{subtotal.toFixed(0)}</span>
                <span className="font-bold text-sm bg-white/20 px-3 py-1 rounded-xl">View Cart</span>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}