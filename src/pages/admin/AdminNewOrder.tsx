import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Bike, CheckCircle2, MessageCircle, Minus, Plus, Store, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { formatBRL, parseBRLInputToCents } from "@/lib/format";
import PixPanel from "@/components/PixPanel";
import type { DeliveryType, MenuResponse, OrderDTO, PaymentMethod, Product } from "@/types";

interface BuilderItem {
  key: string;
  productId: number;
  name: string;
  unitPriceCents: number;
  quantity: number;
  addons: { optionId: number; name: string; priceCents: number }[];
  notes: string;
}

function itemTotalCents(item: BuilderItem): number {
  return item.unitPriceCents * item.quantity;
}

export default function AdminNewOrder() {
  const navigate = useNavigate();
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [items, setItems] = useState<BuilderItem[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("pickup");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [referencePoint, setReferencePoint] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [changeInput, setChangeInput] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ order: OrderDTO; whatsappUrl: string | null } | null>(null);

  useEffect(() => {
    api
      .get<MenuResponse>("/menu")
      .then(setMenu)
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    if (!menu) return [];
    const q = query.trim().toLowerCase();
    if (!q) return menu.products;
    return menu.products.filter((p) => p.name.toLowerCase().includes(q));
  }, [menu, query]);

  const subtotalCents = items.reduce((sum, i) => sum + itemTotalCents(i), 0);
  const deliveryFeeCents = deliveryType === "delivery" ? menu?.settings?.deliveryFeeCents ?? 0 : 0;
  const totalCents = subtotalCents + deliveryFeeCents;

  function addItem(item: BuilderItem) {
    setItems((prev) => [...prev, item]);
    setExpandedProductId(null);
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateQuantity(key: string, quantity: number) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity } : i)).filter((i) => i.quantity > 0));
  }

  async function handleSubmit() {
    if (items.length === 0) {
      setError("Adicione pelo menos um item ao pedido.");
      return;
    }
    if (!customerName.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    if (deliveryType === "delivery" && !address.trim()) {
      setError("Endereço é obrigatório para entrega.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ order: OrderDTO; whatsappUrl: string | null }>("/orders", {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        deliveryType,
        address: deliveryType === "delivery" ? address.trim() : undefined,
        neighborhood: deliveryType === "delivery" ? neighborhood.trim() || undefined : undefined,
        referencePoint: deliveryType === "delivery" ? referencePoint.trim() || undefined : undefined,
        paymentMethod,
        changeForCents: paymentMethod === "cash" ? parseBRLInputToCents(changeInput) : undefined,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          notes: i.notes || undefined,
          addonOptionIds: i.addons.map((a) => a.optionId),
        })),
        isManualEntry: true,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível registrar o pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryType("pickup");
    setAddress("");
    setNeighborhood("");
    setReferencePoint("");
    setPaymentMethod("pix");
    setChangeInput("");
    setNotes("");
    setResult(null);
    setError(null);
  }

  if (loading) return <p className="text-sm text-ink-500">Carregando...</p>;
  if (!menu?.settings) return <p className="text-sm text-red-600">Não foi possível carregar o cardápio.</p>;

  if (result) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-card">
        <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        <div>
          <h1 className="font-display text-xl font-semibold text-ink-900">Pedido registrado!</h1>
          <p className="mt-1 text-sm text-ink-500">
            Código <strong>#{result.order.publicCode}</strong> · Total {formatBRL(result.order.totalCents)}
          </p>
        </div>
        {result.whatsappUrl && (
          <a
            href={result.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-3 font-semibold text-white shadow-soft"
          >
            <MessageCircle className="h-5 w-5" />
            Enviar resumo pro cliente no WhatsApp
          </a>
        )}
        <div className="flex w-full gap-2.5">
          <button
            onClick={() => navigate("/admin/pedidos")}
            className="flex-1 rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium text-ink-700"
          >
            Ver pedidos
          </button>
          <button
            onClick={handleReset}
            className="flex-1 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-soft"
          >
            Lançar outro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid max-w-4xl gap-5 lg:grid-cols-[1.2fr,1fr]">
      <div className="space-y-5">
        <h1 className="font-display text-2xl font-semibold text-ink-900">Lançar pedido manualmente</h1>
        <p className="-mt-3 text-sm text-ink-500">
          Pra pedidos por telefone, WhatsApp direto ou presencial. Funciona mesmo com a loja marcada como fechada.
        </p>

        <div className="rounded-2xl bg-white p-4 shadow-card">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produto..."
            className="mb-3 w-full rounded-xl border border-black/10 p-2.5 text-sm outline-none ring-brand-300 focus:ring-2"
          />
          <div className="max-h-[420px] space-y-2 overflow-y-auto">
            {filteredProducts.map((product) => (
              <ProductPickerRow
                key={product.id}
                product={product}
                expanded={expandedProductId === product.id}
                onToggle={() => setExpandedProductId((prev) => (prev === product.id ? null : product.id))}
                onAdd={addItem}
              />
            ))}
            {filteredProducts.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-500">Nenhum produto encontrado.</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink-900">Itens do pedido</h2>
          {items.length === 0 ? (
            <p className="text-sm text-ink-500">Nenhum item adicionado ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {items.map((item) => (
                <div key={item.key} className="flex items-start gap-2 rounded-xl bg-cream-100 p-2.5">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink-900">{item.name}</p>
                    {item.addons.length > 0 && (
                      <p className="text-xs text-ink-500">{item.addons.map((a) => a.name).join(", ")}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2 rounded-full bg-white px-1.5 py-1 w-fit">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.key, item.quantity - 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/5"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-4 text-center text-xs font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.key, item.quantity + 1)}
                        className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-brand-600">{formatBRL(itemTotalCents(item))}</span>
                  <button onClick={() => removeItem(item.key)} className="text-ink-500 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nome do cliente"
            className="w-full rounded-xl border border-black/10 p-2.5 text-sm outline-none ring-brand-300 focus:ring-2"
          />
          <input
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="Telefone (opcional)"
            className="w-full rounded-xl border border-black/10 p-2.5 text-sm outline-none ring-brand-300 focus:ring-2"
          />

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setDeliveryType("pickup")}
              className={clsx(
                "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium",
                deliveryType === "pickup" ? "border-brand-400 bg-brand-50 text-brand-700" : "border-black/5 bg-cream-100 text-ink-700"
              )}
            >
              <Store className="h-5 w-5" />
              Retirada
            </button>
            <button
              type="button"
              onClick={() => setDeliveryType("delivery")}
              className={clsx(
                "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium",
                deliveryType === "delivery" ? "border-brand-400 bg-brand-50 text-brand-700" : "border-black/5 bg-cream-100 text-ink-700"
              )}
            >
              <Bike className="h-5 w-5" />
              Entrega
            </button>
          </div>

          {deliveryType === "delivery" && (
            <div className="space-y-2.5">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Endereço completo"
                className="w-full rounded-xl border border-black/10 p-2.5 text-sm outline-none ring-brand-300 focus:ring-2"
              />
              <input
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Bairro"
                className="w-full rounded-xl border border-black/10 p-2.5 text-sm outline-none ring-brand-300 focus:ring-2"
              />
              <input
                value={referencePoint}
                onChange={(e) => setReferencePoint(e.target.value)}
                placeholder="Ponto de referência (opcional)"
                className="w-full rounded-xl border border-black/10 p-2.5 text-sm outline-none ring-brand-300 focus:ring-2"
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {(["pix", "card", "cash"] as PaymentMethod[]).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={clsx(
                  "rounded-xl border px-2 py-2.5 text-xs font-medium",
                  paymentMethod === method ? "border-brand-400 bg-brand-50 text-brand-700" : "border-black/5 bg-cream-100 text-ink-700"
                )}
              >
                {method === "pix" ? "PIX" : method === "card" ? "Cartão" : "Dinheiro"}
              </button>
            ))}
          </div>

          {paymentMethod === "pix" && <PixPanel settings={menu.settings} />}
          {paymentMethod === "cash" && (
            <input
              value={changeInput}
              onChange={(e) => setChangeInput(e.target.value)}
              placeholder="Troco para quanto? (opcional)"
              className="w-full rounded-xl border border-black/10 p-2.5 text-sm outline-none ring-brand-300 focus:ring-2"
            />
          )}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações do pedido (opcional)"
            rows={2}
            className="w-full resize-none rounded-xl border border-black/10 p-2.5 text-sm outline-none ring-brand-300 focus:ring-2"
          />
        </div>

        <div className="space-y-3 rounded-2xl bg-white p-4 shadow-card">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-ink-500">
              <span>Subtotal</span>
              <span>{formatBRL(subtotalCents)}</span>
            </div>
            {deliveryFeeCents > 0 && (
              <div className="flex justify-between text-ink-500">
                <span>Taxa de entrega</span>
                <span>{formatBRL(deliveryFeeCents)}</span>
              </div>
            )}
            <div className="flex justify-between font-display text-base font-semibold text-ink-900">
              <span>Total</span>
              <span>{formatBRL(totalCents)}</span>
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-full bg-brand-500 py-3 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
          >
            {submitting ? "Registrando..." : "Registrar pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductPickerRow({
  product,
  expanded,
  onToggle,
  onAdd,
}: {
  product: Product;
  expanded: boolean;
  onToggle: () => void;
  onAdd: (item: BuilderItem) => void;
}) {
  const [selections, setSelections] = useState<Record<number, number[]>>({});
  const [quantity, setQuantity] = useState(1);

  const soldOut = product.stockQuantity === 0;
  const maxQuantity = product.stockQuantity ?? Infinity;

  const selectedAddons = useMemo(() => {
    const result: { optionId: number; name: string; priceCents: number }[] = [];
    for (const group of product.addonGroups) {
      const chosenIds = selections[group.id] ?? [];
      for (const opt of group.options) {
        if (chosenIds.includes(opt.id)) result.push({ optionId: opt.id, name: opt.name, priceCents: opt.priceCents });
      }
    }
    return result;
  }, [selections, product.addonGroups]);

  const missingRequired = product.addonGroups.filter((g) => {
    if (!g.required) return false;
    return (selections[g.id] ?? []).length < Math.max(1, g.minSelect || 1);
  });

  const unitPriceCents = product.priceCents + selectedAddons.reduce((sum, a) => sum + a.priceCents, 0);

  function toggleOption(groupId: number, optionId: number, multiple: boolean, maxSelect: number) {
    setSelections((prev) => {
      const current = prev[groupId] ?? [];
      const isSelected = current.includes(optionId);
      if (!multiple) return { ...prev, [groupId]: isSelected ? [] : [optionId] };
      if (isSelected) return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
  }

  function handleAdd() {
    if (soldOut || missingRequired.length > 0) return;
    onAdd({
      key: crypto.randomUUID(),
      productId: product.id,
      name: product.name,
      unitPriceCents,
      quantity,
      addons: selectedAddons,
      notes: "",
    });
    setSelections({});
    setQuantity(1);
  }

  return (
    <div className={clsx("rounded-xl border", expanded ? "border-brand-300" : "border-black/5")}>
      <button
        type="button"
        onClick={onToggle}
        disabled={soldOut}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left disabled:opacity-50"
      >
        <span className="text-sm font-medium text-ink-900">{product.name}</span>
        <span className="flex items-center gap-2 text-xs text-ink-500">
          {soldOut ? <span className="font-semibold text-red-600">Esgotado</span> : formatBRL(product.priceCents)}
        </span>
      </button>

      {expanded && !soldOut && (
        <div className="space-y-3 border-t border-black/5 p-3">
          {product.addonGroups.map((group) => (
            <div key={group.id}>
              <p className="mb-1.5 text-xs font-semibold text-ink-700">
                {group.name} {group.required && <span className="text-red-500">*</span>}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.options.map((opt) => {
                  const checked = (selections[group.id] ?? []).includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleOption(group.id, opt.id, group.multiple, group.maxSelect)}
                      className={clsx(
                        "rounded-full border px-2.5 py-1 text-xs",
                        checked ? "border-brand-400 bg-brand-50 text-brand-700" : "border-black/10 bg-white text-ink-700"
                      )}
                    >
                      {opt.name}
                      {opt.priceCents > 0 && ` +${formatBRL(opt.priceCents)}`}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-full bg-cream-100 px-1.5 py-1">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-4 text-center text-xs font-medium">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                disabled={quantity >= maxQuantity}
                className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white disabled:opacity-30"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={missingRequired.length > 0}
              className="rounded-full bg-brand-500 px-4 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {missingRequired.length > 0 ? "Selecione as opções" : `Adicionar · ${formatBRL(unitPriceCents * quantity)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
