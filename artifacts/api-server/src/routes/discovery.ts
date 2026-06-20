import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, cafesTable, menuItemsTable } from "@workspace/db";

const router: IRouter = Router();

function parseCafe(cafe: typeof cafesTable.$inferSelect) {
  return {
    ...cafe,
    rating: Number(cafe.rating),
    deliveryFee: Number(cafe.deliveryFee),
    minOrder: Number(cafe.minOrder),
    latitude: cafe.latitude != null ? Number(cafe.latitude) : null,
    longitude: cafe.longitude != null ? Number(cafe.longitude) : null,
    categories: JSON.parse(cafe.categories || "[]"),
  };
}

function parseMenuItem(item: typeof menuItemsTable.$inferSelect, cafeName: string) {
  return {
    ...item,
    cafeName,
    price: Number(item.price),
  };
}

router.get("/discovery/featured", async (_req, res): Promise<void> => {
  const allCafes = await db.select().from(cafesTable);
  const featuredCafes = allCafes.filter(c => c.isFeatured).slice(0, 6);

  const banners = [
    {
      id: 1,
      title: "Your Morning Ritual Awaits",
      subtitle: "Get 20% off on your first coffee order",
      imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800",
      color: "#4A2C2A",
      ctaText: "Order Now",
    },
    {
      id: 2,
      title: "Cold Brews This Summer",
      subtitle: "Free delivery on orders above ₹299",
      imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800",
      color: "#1A3A4A",
      ctaText: "Explore",
    },
    {
      id: 3,
      title: "Freshly Squeezed Smoothies",
      subtitle: "New arrivals every week from Bangalore's best cafes",
      imageUrl: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=800",
      color: "#2A4A1A",
      ctaText: "Browse",
    },
  ];

  const offers = [
    { id: 1, title: "First Order Special", code: "BREW20", discount: "20% OFF", description: "Use on your first order" },
    { id: 2, title: "Free Delivery", code: "FREEDEL", discount: "₹0 Delivery", description: "On orders above ₹299" },
    { id: 3, title: "Weekend Special", code: "WEEKEND15", discount: "15% OFF", description: "Every Sat & Sun" },
  ];

  res.json({
    banners,
    featuredCafes: featuredCafes.map(parseCafe),
    offers,
  });
});

router.get("/discovery/areas", async (_req, res): Promise<void> => {
  const cafes = await db.select().from(cafesTable);
  const areaMap = new Map<string, number>();

  for (const cafe of cafes) {
    areaMap.set(cafe.area, (areaMap.get(cafe.area) || 0) + 1);
  }

  const areaImages: Record<string, string> = {
    "Koramangala": "https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=400",
    "Indiranagar": "https://images.unsplash.com/photo-1513530534585-c7b1394c6d51?w=400",
    "Whitefield": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    "HSR Layout": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400",
    "Jayanagar": "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400",
    "MG Road": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400",
    "Marathahalli": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400",
    "Yelahanka": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400",
  };

  const areas = Array.from(areaMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, cafeCount]) => ({
      name,
      cafeCount,
      imageUrl: areaImages[name] || null,
    }));

  res.json(areas);
});

router.get("/discovery/categories", async (_req, res): Promise<void> => {
  const items = await db.select().from(menuItemsTable);
  const categoryMap = new Map<string, number>();

  for (const item of items) {
    if (item.category) {
      categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1);
    }
  }

  const categoryMeta: Record<string, { name: string; imageUrl: string }> = {
    coffee: { name: "Coffee", imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400" },
    tea: { name: "Tea", imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400" },
    smoothie: { name: "Smoothies", imageUrl: "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=400" },
    mojito: { name: "Mojitos", imageUrl: "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400" },
    beverage: { name: "Beverages", imageUrl: "https://images.unsplash.com/photo-1437418747212-8d9709afab22?w=400" },
  };

  const categories = Array.from(categoryMap.entries()).map(([slug, itemCount]) => ({
    name: categoryMeta[slug]?.name || slug,
    slug,
    itemCount,
    imageUrl: categoryMeta[slug]?.imageUrl || "",
  }));

  res.json(categories);
});

router.get("/discovery/trending", async (_req, res): Promise<void> => {
  const allCafes = await db.select().from(cafesTable);
  const allItems = await db.select().from(menuItemsTable);
  const cafeMap = new Map(allCafes.map(c => [c.id, c.name]));

  const topCafes = [...allCafes]
    .sort((a, b) => b.totalOrders - a.totalOrders || Number(b.rating) - Number(a.rating))
    .slice(0, 5)
    .map(parseCafe);

  const popularItems = allItems
    .filter(i => i.isBestseller)
    .slice(0, 8)
    .map(item => parseMenuItem(item, cafeMap.get(item.cafeId) || ""));

  res.json({ topCafes, popularItems });
});

export default router;
