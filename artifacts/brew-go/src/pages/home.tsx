import { useGetFeatured, useGetTrending, getGetFeaturedQueryKey, getGetTrendingQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { MapPin, Search, Star, Clock, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

export default function Home() {
  const [deliveryLocation, setDeliveryLocation] = useState("Bangalore");

  // Geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
            .then(res => res.json())
            .then(data => {
              const area = data.city || data.locality || data.principalSubdivision || "Bangalore";
              setDeliveryLocation(area);
            })
            .catch(() => setDeliveryLocation("Bangalore"));
        },
        () => {
          setDeliveryLocation("Koramangala"); // fallback
        }
      );
    }
  }, []);

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
                {deliveryLocation} <ChevronRight className="w-4 h-4 opacity-50" />
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

      {/* Rest of your code remains same... */}
      {/* Categories, Featured, Trending same ga undi */}
      {/* ... (needi code copy chesi pettuko) */}
    </div>
  );
}