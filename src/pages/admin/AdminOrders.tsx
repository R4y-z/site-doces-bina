import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { ChevronDown, Plus, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { shareReceipt } from "@/lib/receipt";
import { ORDER_STATUS_LABELS, type OrderDTO } from "@/types";

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const DELIVERY_LABELS: Record<string, string> = { pickup: "Retirada", delivery: "Entrega" };
const PAYMENT_LABELS: Record<string, string> = { pix: "PIX", card: "Cartão", cash: "Dinheiro" };

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [detailsById, setDetailsById] = useState<Record<number, OrderDTO>>({});
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [printingId, setPrintingId] = useState<number | null>(null);
  const [storeName, setStoreName] = useState("Doces da Bina");

  async function load(status: string) {
    setLoading(true);
    const res = await api.get<{ orders: OrderDTO[] }>(`/orders/admin${status ? `?status=${status}` : ""}`);
    setOrders(res.orders);
    setLoading(false);
  }

  useEffect(() => {
    load(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    api.get<{ settings: { storeName: string } }>("/admin/settings").then((res) => setStoreName(res.settings.storeName));
  }, []);

  // A listagem (GET /orders/admin) não traz os itens de cada pedido, só o
  // GET /orders/admin/:id traz. Busca sob demanda e guarda em cache local.
  async function ensureDetails(order: OrderDTO): Promise<OrderDTO> {
    const cached = detailsById[order.id];
    if (cached) return cached;
    const res = await api.get<{ order: OrderDTO }>(`/orders/admin/${order.id}`);
    setDetailsById((prev) => ({ ...prev, [order.id]: res.order }));
    return res.order;
  }

  function toggleExpand(order: OrderDTO) {
    if (expandedId === order.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(order.id);
    ensureDetails(order);
  }

  async function handlePrint(order: OrderDTO) {
    setPrintingId(order.id);
    try {
      const full = await ensureDetails(order);
      const result = await shareReceipt(full, storeName);
      if (result.message) alert(result.message);
    } finally {
      setPrintingId(null);
    }
  }

  async function updateStatus(id: number, status: string) {
    const res = await api.patch<{ order: OrderDTO }>(`/orders/admin/${id}/status`, { status });
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: res.order.status } : o)));
    setDetailsById((prev) => (prev[id] ? { ...prev, [id]: res.order } : prev));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink-900">Pedidos</h1>
        <Link
          to="/admin/pedidos/novo"
          className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-soft"
        >
          <Plus className="h-4 w-4" /> Lançar pedido
        </Link>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={clsx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium",
              statusFilter === f.value ? "bg-brand-500 text-white" : "bg-white text-ink-700 shadow-card"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-ink-500">Carregando...</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-ink-500">Nenhum pedido encontrado.</p>
      ) : (
        <div className="space-y-2.5">
          {orders.map((order) => {
            const expanded = expandedId === order.id;
            const full = detailsById[order.id];
            const printing = printingId === order.id;
            return (
              <div key={order.id} className="overflow-hidden rounded-2xl bg-white shadow-card">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(order)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpand(order);
                    }
                  }}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left"
                >
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                      #{order.publicCode} · {order.customerName}
                      {order.isManualEntry && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                          Lançado manualmente
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-500">
                      {new Date(order.createdAt).toLocaleString("pt-BR")} · {DELIVERY_LABELS[order.deliveryType]} ·{" "}
                      {PAYMENT_LABELS[order.paymentMethod]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-semibold text-brand-600">
                      {formatBRL(order.totalCents)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrint(order);
                      }}
                      aria-label="Imprimir pedido"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-700 hover:bg-black/5"
                    >
                      <Printer className={clsx("h-4 w-4", printing && "animate-pulse")} />
                    </button>
                    <ChevronDown className={clsx("h-4 w-4 text-ink-500 transition-transform", expanded && "rotate-180")} />
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-black/5 px-4 py-4">
                    <div className="mb-3 space-y-1 text-sm text-ink-700">
                      {order.customerPhone && (
                        <p>
                          <strong>Telefone:</strong> {order.customerPhone}
                        </p>
                      )}
                      {order.deliveryType === "delivery" && (
                        <p>
                          <strong>Endereço:</strong> {order.address}
                          {order.neighborhood ? ` · ${order.neighborhood}` : ""}
                          {order.referencePoint ? ` (${order.referencePoint})` : ""}
                        </p>
                      )}
                      {order.paymentMethod === "cash" && order.changeForCents ? (
                        <p>
                          <strong>Troco para:</strong> {formatBRL(order.changeForCents)}
                        </p>
                      ) : null}
                      {order.notes && (
                        <p>
                          <strong>Observações:</strong> {order.notes}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 border-t border-black/5 pt-3">
                      {!full ? (
                        <p className="text-sm text-ink-500">Carregando itens...</p>
                      ) : (
                        full.items.map((item) => (
                          <div key={item.id} className="text-sm">
                            <p className="font-medium text-ink-900">
                              {item.quantity}x {item.productName} — {formatBRL(item.unitPriceCents * item.quantity)}
                            </p>
                            {item.addons.map((a) => (
                              <p key={a.name} className="ml-4 text-xs text-ink-500">
                                + {a.name}
                              </p>
                            ))}
                            {item.notes && <p className="ml-4 text-xs italic text-ink-500">obs: {item.notes}</p>}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 pt-3">
                      <label className="text-xs font-medium text-ink-500">Status:</label>
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className="rounded-lg border border-black/10 px-2.5 py-1.5 text-sm outline-none"
                      >
                        {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handlePrint(order)}
                        disabled={printing}
                        className="ml-auto flex items-center gap-1.5 rounded-full border border-black/10 px-3.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-black/5 disabled:opacity-50"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        {printing ? "Abrindo..." : "Imprimir"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
