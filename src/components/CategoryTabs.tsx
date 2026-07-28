import clsx from "clsx";
import type { Category } from "@/types";

interface Props {
  categories: Category[];
  activeSlug: string;
  onSelect: (slug: string) => void;
}

export default function CategoryTabs({ categories, activeSlug, onSelect }: Props) {
  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-black/5 bg-cream-50/95 px-4 py-3 backdrop-blur">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.slug)}
            className={clsx(
              "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
              activeSlug === cat.slug
                ? "bg-brand-500 text-white shadow-soft"
                : "bg-white text-ink-700 shadow-card hover:bg-brand-50"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
