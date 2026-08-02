import { db } from "./index";
import { cafesTable, menuItemsTable } from "./schema";

async function seed() {
  console.log("Seeding database...");

  // Insert Cafes
  const insertedCafes = await db
    .insert(cafesTable)
    .values([
      {
        name: "Third Wave Coffee",
        description: "Specialty coffee roasters",
        area: "Koramangala",
        address: "80 Feet Road, Koramangala",
        rating: "4.6",
        reviewCount: 320,
        deliveryTime: 25,
        deliveryFee: "30",
        minOrder: "150",
        imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
        categories: JSON.stringify(["coffee", "tea"]),
        isOpen: true,
        totalOrders: 1250,
        isFeatured: true,
        discount: "20% off on first order",
      },
      {
        name: "Blue Tokai Coffee",
        description: "Single origin specialty coffee",
        area: "Indiranagar",
        address: "100 Feet Road, Indiranagar",
        rating: "4.7",
        reviewCount: 410,
        deliveryTime: 30,
        deliveryFee: "40",
        minOrder: "200",
        imageUrl: "https://images.unsplash.com/photo-1511920170033-f8396924c348",
        categories: JSON.stringify(["coffee"]),
        isOpen: true,
        totalOrders: 980,
        isFeatured: true,
      },
      {
        name: "Chaayos",
        description: "Modern chai experience",
        area: "HSR Layout",
        address: "27th Main, HSR Layout",
        rating: "4.3",
        reviewCount: 210,
        deliveryTime: 20,
        deliveryFee: "25",
        minOrder: "100",
        imageUrl: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f",
        categories: JSON.stringify(["tea", "beverage"]),
        isOpen: true,
        totalOrders: 760,
        isFeatured: false,
      },
      {
        name: "Starbucks",
        description: "Global coffee chain",
        area: "MG Road",
        address: "MG Road, Bangalore",
        rating: "4.4",
        reviewCount: 890,
        deliveryTime: 35,
        deliveryFee: "50",
        minOrder: "250",
        imageUrl: "https://images.unsplash.com/photo-1453614512568-c4024d13c247",
        categories: JSON.stringify(["coffee", "beverage"]),
        isOpen: true,
        totalOrders: 2100,
        isFeatured: true,
      },
      {
        name: "Mojito Bar",
        description: "Fresh mojitos & mocktails",
        area: "Jayanagar",
        address: "4th Block, Jayanagar",
        rating: "4.5",
        reviewCount: 150,
        deliveryTime: 22,
        deliveryFee: "30",
        minOrder: "180",
        imageUrl: "https://images.unsplash.com/photo-1551538827-9c037cb4f32a",
        categories: JSON.stringify(["mojito", "beverage"]),
        isOpen: true,
        totalOrders: 430,
        isFeatured: false,
      },
    ])
    .returning();

  console.log(`Inserted ${insertedCafes.length} cafes`);

  // Insert Menu Items
  await db.insert(menuItemsTable).values([
    {
      cafeId: insertedCafes[0].id,
      name: "Cold Brew",
      description: "Smooth cold brew coffee",
      price: "180",
      category: "coffee",
      imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735",
      isAvailable: true,
      isVeg: true,
      isBestseller: true,
    },
    {
      cafeId: insertedCafes[0].id,
      name: "Cappuccino",
      description: "Classic cappuccino",
      price: "160",
      category: "coffee",
      imageUrl: "https://images.unsplash.com/photo-1572442388796-11668a67e53d",
      isAvailable: true,
      isVeg: true,
    },
    {
      cafeId: insertedCafes[1].id,
      name: "Filter Coffee",
      description: "Traditional South Indian filter coffee",
      price: "90",
      category: "coffee",
      imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd",
      isAvailable: true,
      isVeg: true,
      isBestseller: true,
    },
    {
      cafeId: insertedCafes[2].id,
      name: "Masala Chai",
      description: "Spiced Indian chai",
      price: "80",
      category: "tea",
      imageUrl: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f",
      isAvailable: true,
      isVeg: true,
    },
    {
      cafeId: insertedCafes[4].id,
      name: "Classic Mojito",
      description: "Fresh mint mojito",
      price: "220",
      category: "mojito",
      imageUrl: "https://images.unsplash.com/photo-1551538827-9c037cb4f32a",
      isAvailable: true,
      isVeg: true,
      isBestseller: true,
    },
  ]);

  console.log("Menu items inserted");
  console.log("✅ Seeding completed!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});