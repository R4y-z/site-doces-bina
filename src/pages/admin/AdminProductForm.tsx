import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import ImageUploader from "@/components/admin/ImageUploader";
import type { Category, Product } from "@/types";

interface FormAddonOption {
  name: string;
  price: string; // reais, ex: "3.50"
  active: boolean;
}

interface FormAddonGroup {
  name: string;
  required: boolean;
  multiple: boolean;
  minSelect: number;
  maxSelect: number;
  options: FormAddonOption[];
}

function centsToReaisStr(cents: number): string {
  return (cents / 100).toFixed(2);
}

function reaisStrToCents(value: string): number {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export default function AdminProductForm() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [featured, setFeatured] = useState(false);
  const [active, setActive] = useState(true);
  const [addonGroups, setAddonGroups] = useState<FormAddonGroup[]>([]);

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ categories: Category[] }>("/admin/categories").then((res) => {
      setCategories(res.categories);
      setCategoryId((prev) => prev || res.categories[0]?.id || "");
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    api.get<{ product: Product }>(`/admin/products/${id}`).then((res) => {
      const p = res.product;
      setName(p.name);
      setDescription(p.description);
      setPrice(centsToReaisStr(p.priceCents));
      setCategoryId(p.categoryId);
      setImageUrl(p.imageUrl);
      setFeatured(p.featured);
      setActive(p.active);
      setAddonGroups(
        p.addonGroups.map((g) => ({
          name: g.name,
          required: g.required,
          multiple: g.multiple,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          options: g.options.map((o) => ({ name: o.name, price: centsToReaisStr(o.priceCents), active: o.active })),
        }))
      );
      setLoading(false);
    });
  }, [id]);

  function addGroup() {
    setAddonGroups((prev) => [
      ...prev,
      { name: "", required: false, multiple: false, minSelect: 0, maxSelect: 1, options: [] },
    ]);
  }

  function updateGroup(index: number, patch: Partial<FormAddonGroup>) {
    setAddonGroups((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }

  function removeGroup(index: number) {
    setAddonGroups((prev) => prev.filter((_, i) => i !== index));
  }

  function addOption(groupIndex: number) {
    setAddonGroups((prev) =>
      prev.map((g, i) => (i === groupIndex ? { ...g, options: [...g.options, { name: "", price: "0", active: true }] } : g))
    );
  }

  function updateOption(groupIndex: number, optionIndex: number, patch: Partial<FormAddonOption>) {
    setAddonGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex
          ? { ...g, options: g.options.map((o, j) => (j === optionIndex ? { ...o, ...patch } : o)) }
          : g
      )
    );
  }

  function removeOption(groupIndex: number, optionIndex: number) {
    setAddonGroups((prev) =>
      prev.map((g, i) => (i === groupIndex ? { ...g, options: g.options.filter((_, j) => j !== optionIndex) } : g))
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!categoryId) {
      setError("Selecione uma categoria.");
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name,
      description,
      priceCents: reaisStrToCents(price),
      categoryId: Number(categoryId),
      imageUrl,
      featured,
      active,
      addonGroups: addonGroups
        .filter((g) => g.name.trim())
        .map((g) => ({
          name: g.name,
          required: g.required,
          multiple: g.multiple,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          options: g.options
            .filter((o) => o.name.trim())
            .map((o) => ({ name: o.name, priceCents: reaisStrToCents(o.price), active: o.active })),
        })),
    };

    try {
      if (isEditing) {
        await api.put(`/admin/products/${id}`, payload);
      } else {
        await api.post("/admin/products", payload);
      }
      navigate("/admin/produtos");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar produto.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-ink-500">Carregando...</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 pb-16">
      <h1 className="font-display text-2xl font-semibold text-ink-900">
        {isEditing ? "Editar produto" : "Novo produto"}
      </h1>

      <div className="space-y-4 rounded-2xl bg-white p-5 shadow-card">
        <ImageUploader value={imageUrl} onChange={setImageUrl} folder="products" label="Foto do produto" />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700">Nome</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-black/10 p-2.5 text-sm outline-none ring-brand-300 focus:ring-2"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700">Descrição curta</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-black/10 p-2.5 text-sm outline-none ring-brand-300 focus:ring-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Preço (R$)</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl border border-black/10 p-2.5 text-sm outline-none ring-brand-300 focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full rounded-xl border border-black/10 p-2.5 text-sm outline-none ring-brand-300 focus:ring-2"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-5">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 accent-brand-500" />
            Destaque no cardápio
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-brand-500" />
            Visível para clientes
          </label>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">Acompanhamentos / adicionais</h2>
          <button
            type="button"
            onClick={addGroup}
            className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-black/5"
          >
            <Plus className="h-3.5 w-3.5" /> Novo grupo
          </button>
        </div>

        {addonGroups.map((group, gIndex) => (
          <div key={gIndex} className="space-y-3 rounded-xl border border-black/10 p-4">
            <div className="flex items-center gap-2">
              <input
                value={group.name}
                onChange={(e) => updateGroup(gIndex, { name: e.target.value })}
                placeholder="Nome do grupo (ex: Escolha a calda)"
                className="flex-1 rounded-lg border border-black/10 p-2 text-sm outline-none ring-brand-300 focus:ring-2"
              />
              <button type="button" onClick={() => removeGroup(gIndex)} className="text-ink-500 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-ink-700">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={group.required}
                  onChange={(e) => updateGroup(gIndex, { required: e.target.checked })}
                  className="h-3.5 w-3.5 accent-brand-500"
                />
                Obrigatório
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={group.multiple}
                  onChange={(e) => updateGroup(gIndex, { multiple: e.target.checked })}
                  className="h-3.5 w-3.5 accent-brand-500"
                />
                Múltipla escolha
              </label>
              {group.multiple && (
                <label className="flex items-center gap-1.5">
                  Máx.
                  <input
                    type="number"
                    min={1}
                    value={group.maxSelect}
                    onChange={(e) => updateGroup(gIndex, { maxSelect: Number(e.target.value) })}
                    className="w-14 rounded border border-black/10 p-1 text-xs"
                  />
                </label>
              )}
            </div>

            <div className="space-y-2">
              {group.options.map((opt, oIndex) => (
                <div key={oIndex} className="flex items-center gap-2">
                  <input
                    value={opt.name}
                    onChange={(e) => updateOption(gIndex, oIndex, { name: e.target.value })}
                    placeholder="Nome da opção"
                    className="flex-1 rounded-lg border border-black/10 p-2 text-sm outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={opt.price}
                    onChange={(e) => updateOption(gIndex, oIndex, { price: e.target.value })}
                    placeholder="0,00"
                    className="w-24 rounded-lg border border-black/10 p-2 text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(gIndex, oIndex)}
                    className="text-ink-500 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addOption(gIndex)}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar opção
              </button>
            </div>
          </div>
        ))}

        {addonGroups.length === 0 && (
          <p className="text-sm text-ink-500">Nenhum grupo de adicionais. Útil para caldas, embalagens, talheres etc.</p>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => navigate("/admin/produtos")}
          className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium text-ink-700"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar produto"}
        </button>
      </div>
    </form>
  );
}
