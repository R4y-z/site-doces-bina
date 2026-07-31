import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import type { Category, Product } from "@/types";

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [productsRes, categoriesRes] = await Promise.all([
      api.get<{ products: Product[] }>("/admin/products"),
      api.get<{ categories: Category[] }>("/admin/categories"),
    ]);
    setProducts(productsRes.products);
    setCategories(categoriesRes.categories);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(product: Product) {
    if (!confirm(`Excluir "${product.name}"?`)) return;
    await api.delete(`/admin/products/${product.id}`);
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
  }

  const categoryName = (id: number) => categories.find((c) => c.id === id)?.name ?? "—";

  function StockBadge({ stockQuantity }: { stockQuantity: number | null }) {
    if (stockQuantity === null) return null;
    if (stockQuantity === 0) {
      return (
        <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
          Esgotado
        </span>
      );
    }
    if (stockQuantity < 5) {
      return (
        <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
          Baixo: {stockQuantity}
        </span>
      );
    }
    return (
      <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        {stockQuantity} em estoque
      </span>
    );
  }

  if (loading) return <p className="text-sm text-ink-500">Carregando...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink-900">Produtos</h1>
        <Link
          to="/admin/produtos/novo"
          className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-soft"
        >
          <Plus className="h-4 w-4" /> Novo produto
        </Link>
      </div>

      <div className="divide-y divide-black/5 rounded-2xl bg-white shadow-card">
        {products.map((product) => (
          <div key={product.id} className="flex items-center gap-3 px-4 py-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-100">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg">🍬</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">{product.name}</p>
              <p className="text-xs text-ink-500">
                {categoryName(product.categoryId)} · {formatBRL(product.priceCents)}
                {!product.active && " · oculto"}
                {product.featured && " · destaque"}
              </p>
            </div>
            <StockBadge stockQuantity={product.stockQuantity} />
            <Link
              to={`/admin/produtos/${product.id}`}
              className="rounded-full p-2 text-ink-700 hover:bg-black/5"
              aria-label="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Link>
            <button
              onClick={() => handleDelete(product)}
              className="rounded-full p-2 text-ink-500 hover:bg-red-50 hover:text-red-500"
              aria-label="Excluir"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {products.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-ink-500">Nenhum produto cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}
