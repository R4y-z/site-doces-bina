import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import CategoryTabs from "@/components/CategoryTabs";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import FloatingCartButton from "@/components/FloatingCartButton";
import CartDrawer from "@/components/CartDrawer";
import type { MenuResponse, Product } from "@/types";

export default function Home() {
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [activeSlug, setActiveSlug] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    api
      .get<MenuResponse>("/menu")
      .then((data) => {
        setMenu(data);
        if (data.categories.length > 0) setActiveSlug(data.categories[0].slug);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    if (!menu) return [];
    const q = query.trim().toLowerCase();
    if (!q) return menu.products;
    return menu.products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [menu, query]);

  const productsByCategory = useMemo(() => {
    const map = new Map<number, Product[]>();
    for (const p of filteredProducts) {
      const list = map.get(p.categoryId) ?? [];
      list.push(p);
      map.set(p.categoryId, list);
    }
    return map;
  }, [filteredProducts]);

  function handleSelectCategory(slug: string) {
    setActiveSlug(slug);
    sectionRefs.current[slug]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50">
        <span className="animate-pulse text-3xl">🍰</span>
      </div>
    );
  }

  if (loadError || !menu || !menu.settings) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-cream-50 px-6 text-center">
        <p className="font-medium text-ink-900">Não foi possível carregar o cardápio.</p>
        <p className="text-sm text-ink-500">Verifique sua conexão e tente novamente em instantes.</p>
      </div>
    );
  }

  const { settings, categories } = menu;
  const isSearching = query.trim().length > 0;

  return (
    <div className="min-h-screen pb-28">
      <Header settings={settings} />

      <main className="mx-auto max-w-3xl px-4">
        <div className="mt-4">
          <SearchBar value={query} onChange={setQuery} />
        </div>

        {!isSearching && categories.length > 0 && (
          <div className="mt-4">
            <CategoryTabs categories={categories} activeSlug={activeSlug} onSelect={handleSelectCategory} />
          </div>
        )}

        <div className="mt-5 space-y-8 pb-4">
          {isSearching ? (
            filteredProducts.length === 0 ? (
              <p className="py-16 text-center text-sm text-ink-500">Nenhum item encontrado para "{query}".</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onSelect={() => setSelectedProduct(product)} />
                ))}
              </div>
            )
          ) : (
            categories.map((cat) => {
              const products = productsByCategory.get(cat.id) ?? [];
              if (products.length === 0) return null;
              return (
                <section
                  key={cat.id}
                  ref={(el) => {
                    sectionRefs.current[cat.slug] = el;
                  }}
                  className="scroll-mt-24"
                >
                  <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">{cat.name}</h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product} onSelect={() => setSelectedProduct(product)} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </main>

      {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}

      <CartDrawer settings={settings} />
      <FloatingCartButton />
    </div>
  );
}
