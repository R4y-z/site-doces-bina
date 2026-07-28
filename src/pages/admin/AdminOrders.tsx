import { useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { ORDER_STATUS_LABELS, type OrderDTO } from "@/types";

const STATUS_FILTERS = [
  { value: "", label: "Todos" },
  ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const DELIVERY_LABELS: Record<string, string> = { pickup: "Retirada", delivery: "Entrega" };
const PAYMENT_LABELS: Record<string, string> = { pix: "PIX", card: "Cartão", cash: "Dinheiro" };

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(status: string) {
    setLoading(true);
    const res = await api.get<{ orders: OrderDTO[] }>(`/orders/admin${status ? `?status=${status}` : ""}`);
    setOrders(res.orders);
    setLoading(false);
  }

  useEffect(() => {
    load(statusFilter);
  }, [statusFilter]);

  async function updateStatus(id: number, status: string) {
    const res = await api.patch<{ order: OrderDTO }>(`/orders/admin/${id}/status`, { status });
    setOrders((prev) => prev.map((o) => (o.id === id ? res.order : o)));
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-semibold text-ink-900">Pedidos</h1>

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
            return (
              <div key={order.id} className="overflow-hidden rounded-2xl bg-white shadow-card">
                <button
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                >
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      #{order.publicCode} · {order.customerName}
                    </p>
                    <p className="text-xs text-ink-500">
                      {new Date(order.createdAt).toLocaleString("pt-BR")} · {DELIVERY_LABELS[order.deliveryType]} ·{" "}
                      {PAYMENT_LABELS[order.paymentMethod]}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm font-semibold text-brand-600">
                      {formatBRL(order.totalCents)}
                    </span>
                    <ChevronDown className={clsx("h-4 w-4 text-ink-500 transition-transform", expanded && "rotate-180")} />
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-black/5 px-4 py-4">
                    <div className="mb-3 space-y-1 text-sm text-ink-700">
                      <p>
                        <strong>Telefone:</strong> {order.customerPhone}
                      </p>
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
                      {order.items.map((item) => (
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
                      ))}
                    </div>

                    <div className="mt-4 flex items-center gap-2 border-t border-black/5 pt-3">
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
