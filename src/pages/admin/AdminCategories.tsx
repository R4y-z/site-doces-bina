import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Category } from "@/types";

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await api.get<{ categories: Category[] }>("/admin/categories");
    setCategories(res.categories);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    try {
      const res = await api.post<{ category: Category }>("/admin/categories", {
        name: newName.trim(),
        sortOrder: categories.length,
      });
      setCategories((prev) => [...prev, res.category]);
      setNewName("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar categoria.");
    }
  }

  async function handleRename(cat: Category, name: string) {
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, name } : c)));
  }

  async function handleBlurSave(cat: Category) {
    await api.put(`/admin/categories/${cat.id}`, { name: cat.name });
  }

  async function handleToggleActive(cat: Category) {
    const res = await api.put<{ category: Category }>(`/admin/categories/${cat.id}`, { active: !cat.active });
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? res.category : c)));
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Excluir a categoria "${cat.name}"? Os produtos vinculados também serão removidos.`)) return;
    await api.delete(`/admin/categories/${cat.id}`);
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
  }

  if (loading) return <p className="text-sm text-ink-500">Carregando...</p>;

  return (
    <div className="max-w-xl space-y-5">
      <h1 className="font-display text-2xl font-semibold text-ink-900">Categorias</h1>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova categoria (ex: Tortas)"
          className="flex-1 rounded-xl border border-black/10 bg-white p-2.5 text-sm outline-none ring-brand-300 focus:ring-2"
        />
        <button type="submit" className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white">
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="divide-y divide-black/5 rounded-2xl bg-white shadow-card">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
            <GripVertical className="h-4 w-4 shrink-0 text-ink-500/50" />
            <input
              value={cat.name}
              onChange={(e) => handleRename(cat, e.target.value)}
              onBlur={() => handleBlurSave(cat)}
              className="flex-1 bg-transparent text-sm font-medium text-ink-900 outline-none"
            />
            <button
              onClick={() => handleToggleActive(cat)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                cat.active ? "bg-emerald-50 text-emerald-700" : "bg-ink-900/5 text-ink-500"
              }`}
            >
              {cat.active ? "Ativa" : "Oculta"}
            </button>
            <button onClick={() => handleDelete(cat)} className="text-ink-500 hover:text-red-500" aria-label="Excluir">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {categories.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-500">Nenhuma categoria ainda.</p>}
      </div>
    </div>
  );
}
