import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Power } from "lucide-react";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import { ORDER_STATUS_LABELS, type OrderDTO } from "@/types";

interface AdminSettingsDTO {
  storeName: string;
  isOpen: boolean;
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [settings, setSettings] = useState<AdminSettingsDTO | null>(null);
  const [toggling, setToggling] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [ordersRes, settingsRes] = await Promise.all([
      api.get<{ orders: OrderDTO[] }>("/orders/admin"),
      api.get<{ settings: AdminSettingsDTO }>("/admin/settings"),
    ]);
    setOrders(ordersRes.orders);
    setSettings(settingsRes.settings);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleToggle() {
    setToggling(true);
    const res = await api.post<{ isOpen: boolean }>("/admin/settings/toggle-open");
    setSettings((prev) => (prev ? { ...prev, isOpen: res.isOpen } : prev));
    setToggling(false);
  }

  if (loading) return <p className="text-sm text-ink-500">Carregando...</p>;

  const activeOrders = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
  const todayRevenue = orders
    .filter((o) => o.status !== "cancelled" && o.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10))
    .reduce((sum, o) => sum + o.totalCents, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink-900">Olá! 👋</h1>
        {settings && (
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-card transition-colors ${
              settings.isOpen ? "bg-emerald-500 text-white" : "bg-ink-900 text-white"
            }`}
          >
            <Power className="h-4 w-4" />
            {settings.isOpen ? "Loja aberta — clique para fechar" : "Loja fechada — clique para abrir"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pedidos ativos" value={String(activeOrders.length)} />
        <StatCard label="Total de pedidos" value={String(orders.length)} />
        <StatCard label="Faturamento hoje" value={formatBRL(todayRevenue)} />
        <StatCard label="Status da loja" value={settings?.isOpen ? "Aberta" : "Fechada"} />
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">Últimos pedidos</h2>
          <Link to="/admin/pedidos" className="text-sm font-medium text-brand-600 hover:underline">
            Ver todos
          </Link>
        </div>

        {orders.length === 0 ? (
          <p className="text-sm text-ink-500">Nenhum pedido ainda.</p>
        ) : (
          <div className="divide-y divide-black/5">
            {orders.slice(0, 6).map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium text-ink-900">
                    #{order.publicCode} · {order.customerName}
                  </p>
                  <p className="text-xs text-ink-500">{ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
                </div>
                <span className="font-medium text-brand-600">{formatBRL(order.totalCents)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-ink-900">{value}</p>
    </div>
  );
}
