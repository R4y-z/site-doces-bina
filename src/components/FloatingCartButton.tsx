import { ShoppingBag } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { useCartStore } from "@/store/cart";

export default function FloatingCartButton() {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotalCents());
  const openCart = useCartStore((s) => s.openCart);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  if (totalItems === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 safe-bottom sm:flex sm:justify-center">
      <button
        type="button"
        onClick={openCart}
        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-ink-900 px-5 py-4 text-white shadow-soft transition-transform active:scale-[0.99] sm:max-w-md"
      >
        <span className="flex items-center gap-2 font-medium">
          <span className="relative">
            <ShoppingBag className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold">
              {totalItems}
            </span>
          </span>
          Ver sacola
        </span>
        <span className="font-display font-semibold">{formatBRL(subtotal)}</span>
      </button>
    </div>
  );
}
