import { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
  menuItemId: number;
  cafeId: number;
  cafeName: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  customization?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (menuItemId: number, customization?: string) => void;
  updateQuantity: (menuItemId: number, quantity: number, customization?: string) => void;
  clearCart: () => void;
  cafeId: number | null;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem("brewgo_cart");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("brewgo_cart", JSON.stringify(items));
  }, [items]);

  const addItem = (newItem: CartItem) => {
    setItems((currentItems) => {
      // If adding from a different cafe, clear cart first
      const itemsToUpdate = currentItems.length > 0 && currentItems[0].cafeId !== newItem.cafeId 
        ? [] 
        : currentItems;

      const existingIndex = itemsToUpdate.findIndex(
        (i) => i.menuItemId === newItem.menuItemId && i.customization === newItem.customization
      );

      if (existingIndex >= 0) {
        const updated = [...itemsToUpdate];
        updated[existingIndex].quantity += newItem.quantity;
        return updated;
      }
      return [...itemsToUpdate, newItem];
    });
  };

  const removeItem = (menuItemId: number, customization?: string) => {
    setItems((current) => 
      current.filter((i) => !(i.menuItemId === menuItemId && i.customization === customization))
    );
  };

  const updateQuantity = (menuItemId: number, quantity: number, customization?: string) => {
    if (quantity <= 0) {
      removeItem(menuItemId, customization);
      return;
    }
    setItems((current) =>
      current.map((i) =>
        i.menuItemId === menuItemId && i.customization === customization
          ? { ...i, quantity }
          : i
      )
    );
  };

  const clearCart = () => setItems([]);

  const cafeId = items.length > 0 ? items[0].cafeId : null;
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, cafeId, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
