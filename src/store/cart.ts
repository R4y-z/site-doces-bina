import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartAddon, CartItem } from "@/types";

interface AddItemInput {
  productId: number;
  name: string;
  imageUrl: string | null;
  basePriceCents: number;
  quantity: number;
  addons: CartAddon[];
  notes: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: AddItemInput) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  totalItems: () => number;
  subtotalCents: () => number;
}

function itemTotalCents(item: CartItem): number {
  const addonsTotal = item.addons.reduce((sum, a) => sum + a.priceCents, 0);
  return (item.basePriceCents + addonsTotal) * item.quantity;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            { ...item, cartItemId: crypto.randomUUID() },
          ],
          isOpen: true,
        })),

      removeItem: (cartItemId) =>
        set((state) => ({ items: state.items.filter((i) => i.cartItemId !== cartItemId) })),

      updateQuantity: (cartItemId, quantity) =>
        set((state) => ({
          items: state.items
            .map((i) => (i.cartItemId === cartItemId ? { ...i, quantity } : i))
            .filter((i) => i.quantity > 0),
        })),

      clear: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      subtotalCents: () => get().items.reduce((sum, i) => sum + itemTotalCents(i), 0),
    }),
    { name: "doceria-cart" }
  )
);

export function cartItemTotalCents(item: CartItem): number {
  return itemTotalCents(item);
}
