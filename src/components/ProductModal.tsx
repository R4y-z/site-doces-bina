import { useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import clsx from "clsx";
import { formatBRL } from "@/lib/format";
import { useCartStore } from "@/store/cart";
import type { AddonGroup, CartAddon, Product } from "@/types";

interface Props {
  product: Product;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const [selections, setSelections] = useState<Record<number, number[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const selectedAddons: CartAddon[] = useMemo(() => {
    const result: CartAddon[] = [];
    for (const group of product.addonGroups) {
      const chosenIds = selections[group.id] ?? [];
      for (const opt of group.options) {
        if (chosenIds.includes(opt.id)) {
          result.push({ optionId: opt.id, name: opt.name, priceCents: opt.priceCents });
        }
      }
    }
    return result;
  }, [selections, product.addonGroups]);

  const unitPriceCents = product.priceCents + selectedAddons.reduce((sum, a) => sum + a.priceCents, 0);
  const totalCents = unitPriceCents * quantity;

  const missingRequired = product.addonGroups.filter((g) => {
    if (!g.required) return false;
    const count = (selections[g.id] ?? []).length;
    return count < Math.max(1, g.minSelect || 1);
  });

  function toggleOption(group: AddonGroup, optionId: number) {
    setSelections((prev) => {
      const current = prev[group.id] ?? [];
      const isSelected = current.includes(optionId);

      if (!group.multiple) {
        return { ...prev, [group.id]: isSelected ? [] : [optionId] };
      }

      if (isSelected) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= group.maxSelect) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  }

  function handleAdd() {
    if (missingRequired.length > 0) return;
    addItem({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      basePriceCents: product.priceCents,
      quantity,
      addons: selectedAddons,
      notes: notes.trim(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <div className="relative z-10 flex max-h-[92vh] w-full animate-slide-up flex-col overflow-hidden rounded-t-3xl bg-cream-50 shadow-soft sm:max-w-lg sm:rounded-3xl">
        <div className="relative h-48 shrink-0 bg-brand-50 sm:h-56">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl">🍬</div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-soft"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <h2 className="font-display text-xl font-semibold text-ink-900">{product.name}</h2>
          {product.description && <p className="mt-1.5 text-sm text-ink-500">{product.description}</p>}
          <p className="mt-2 font-display text-lg font-semibold text-brand-600">{formatBRL(product.priceCents)}</p>

          {product.addonGroups.map((group) => (
            <div key={group.id} className="mt-5">
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-ink-900">{group.name}</h3>
                <span className="text-xs text-ink-500">
                  {group.required ? "Obrigatório" : "Opcional"}
                  {group.multiple ? ` · até ${group.maxSelect}` : ""}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {group.options.map((opt) => {
                  const checked = (selections[group.id] ?? []).includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      className={clsx(
                        "flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition-colors",
                        checked ? "border-brand-400 bg-brand-50" : "border-black/5 bg-white"
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <input
                          type={group.multiple ? "checkbox" : "radio"}
                          name={`group-${group.id}`}
                          checked={checked}
                          onChange={() => toggleOption(group, opt.id)}
                          className="h-4 w-4 accent-brand-500"
                        />
                        {opt.name}
                      </span>
                      {opt.priceCents > 0 && (
                        <span className="text-ink-500">+{formatBRL(opt.priceCents)}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-ink-900">Alguma observação?</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: sem açúcar, escrever 'Parabéns' na embalagem..."
              rows={2}
              maxLength={280}
              className="w-full resize-none rounded-xl border border-black/5 bg-white p-3 text-sm outline-none ring-brand-300 placeholder:text-ink-500/60 focus:ring-2"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-black/5 bg-cream-50 px-5 py-4 safe-bottom">
          <div className="flex items-center gap-3 rounded-full bg-white px-2 py-1.5 shadow-card">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-700 hover:bg-black/5"
              aria-label="Diminuir quantidade"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-5 text-center font-medium">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-700 hover:bg-black/5"
              aria-label="Aumentar quantidade"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={missingRequired.length > 0}
            className="flex flex-1 items-center justify-between rounded-full bg-brand-500 px-5 py-3 font-semibold text-white shadow-soft transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>{missingRequired.length > 0 ? "Selecione as opções" : "Adicionar"}</span>
            <span>{formatBRL(totalCents)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
