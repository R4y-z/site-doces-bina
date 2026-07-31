import { Plus } from "lucide-react";
import { formatBRL } from "@/lib/format";
import type { Product } from "@/types";

export default function ProductCard({ product, onSelect }: { product: Product; onSelect: () => void }) {
  const soldOut = product.stockQuantity === 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-stretch gap-3 overflow-hidden rounded-2xl bg-white p-3 text-left shadow-card transition-transform active:scale-[0.98] sm:flex-col sm:p-0"
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-brand-50 sm:h-40 sm:w-full sm:rounded-none sm:rounded-t-2xl">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${soldOut ? "grayscale opacity-60" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">🍬</div>
        )}
        {soldOut ? (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-ink-900/80 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm sm:left-2 sm:top-2">
            Esgotado
          </span>
        ) : (
          product.featured && (
            <span className="absolute left-1.5 top-1.5 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm sm:left-2 sm:top-2">
              Destaque
            </span>
          )
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center gap-1 sm:p-3.5">
        <h3 className="font-medium leading-snug text-ink-900 line-clamp-2">{product.name}</h3>
        {product.description && (
          <p className="line-clamp-2 text-xs text-ink-500 sm:text-sm">{product.description}</p>
        )}
        <div className="mt-1 flex items-center justify-between">
          <span className="font-display text-base font-semibold text-brand-600 sm:text-lg">
            {formatBRL(product.priceCents)}
          </span>
          {soldOut ? (
            <span className="text-xs font-medium text-ink-500">Esgotado</span>
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-white shadow-sm transition-transform group-hover:scale-110 sm:h-8 sm:w-8">
              <Plus className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
