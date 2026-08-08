import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Heart, Star, Clock, MapPin, RefreshCw } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

type FavCafe = {
  id: number;
  cafeId: number;
  name: string;
  area: string;
  rating: string;
  deliveryTime: number;
  imageUrl: string;
  deliveryFee: string;
};

export default function Favorites() {
  const [favs, setFavs] = useState<FavCafe[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("token"));
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/api/favorites`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then(setFavs)
      .catch(() => setFavs([]))
      .finally(() => setLoading(false));
  }, [token]);

  async function removeFav(cafeId: number) {
    if (!token) return;
    await fetch(`${API_BASE}/api/favorites/${cafeId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setFavs((prev) => prev.filter((f) => f.cafeId !== cafeId));
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <Heart className="w-16 h-16 text-muted-foreground/40 mb-4" />
        <h2 className="font-bold text-xl mb-2">Sign in to save favorites</h2>
        <Link href="/login">
          <button className="bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl mt-2">
            Sign in
          </button>
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="px-4 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          Favorites
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{favs.length} saved cafes</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {favs.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="font-bold text-lg text-muted-foreground">No favorites yet</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Tap the heart on any cafe to save it
            </p>
            <Link href="/cafes">
              <button className="bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-xl">
                Browse Cafes
              </button>
            </Link>
          </div>
        ) : (
          favs.map((cafe) => (
            <div key={cafe.cafeId} className="bg-card border border-border rounded-2xl overflow-hidden flex">
              <Link href={`/cafes/${cafe.cafeId}`} className="flex flex-1 min-w-0">
                <img src={cafe.imageUrl} alt={cafe.name} className="w-24 h-24 object-cover shrink-0" />
                <div className="p-3 flex-1 min-w-0">
                  <p className="font-bold truncate">{cafe.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {cafe.area}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs">
                    <span className="flex items-center gap-0.5 font-bold text-green-600">
                      <Star className="w-3 h-3 fill-green-600" /> {cafe.rating}
                    </span>
                    <span className="flex items-center gap-0.5 text-muted-foreground">
                      <Clock className="w-3 h-3" /> {cafe.deliveryTime}m
                    </span>
                  </div>
                </div>
              </Link>
              <button
                onClick={() => removeFav(cafe.cafeId)}
                className="px-4 flex items-center text-red-500 hover:bg-red-50 transition-colors"
                title="Remove"
              >
                <Heart className="w-5 h-5 fill-red-500" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}