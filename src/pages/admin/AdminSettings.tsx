import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";
import ImageUploader from "@/components/admin/ImageUploader";
import type { StoreSettings } from "@/types";

function centsToReaisStr(cents: number): string {
  return (cents / 100).toFixed(2);
}

function reaisStrToCents(value: string): number {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [deliveryFee, setDeliveryFee] = useState("0.00");
  const [minOrder, setMinOrder] = useState("0.00");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<{ settings: StoreSettings }>("/admin/settings").then((res) => {
      setSettings(res.settings);
      setDeliveryFee(centsToReaisStr(res.settings.deliveryFeeCents));
      setMinOrder(centsToReaisStr(res.settings.minOrderCents));
      setLoading(false);
    });
  }, []);

  function set<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.put("/admin/settings", {
        ...settings,
        deliveryFeeCents: reaisStrToCents(deliveryFee),
        minOrderCents: reaisStrToCents(minOrder),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !settings) return <p className="text-sm text-ink-500">Carregando...</p>;

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 pb-16">
      <h1 className="font-display text-2xl font-semibold text-ink-900">Configurações da loja</h1>

      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-card">
        <h2 className="font-display text-lg font-semibold text-ink-900">Identidade</h2>
        <div className="grid grid-cols-2 gap-4">
          <ImageUploader value={settings.logoUrl} onChange={(v) => set("logoUrl", v)} folder="store" label="Logo" />
          <ImageUploader value={settings.bannerUrl} onChange={(v) => set("bannerUrl", v)} folder="store" label="Banner" />
        </div>
        <Field label="Nome da loja">
          <input value={settings.storeName} onChange={(e) => set("storeName", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Frase de efeito">
          <input value={settings.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={settings.isOpen}
            onChange={(e) => set("isOpen", e.target.checked)}
            className="h-4 w-4 accent-brand-500"
          />
          Loja aberta para pedidos
        </label>
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-card">
        <h2 className="font-display text-lg font-semibold text-ink-900">Contato e entrega</h2>
        <Field label="Endereço">
          <input value={settings.address ?? ""} onChange={(e) => set("address", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Horário de funcionamento">
          <input value={settings.hoursText ?? ""} onChange={(e) => set("hoursText", e.target.value)} className={inputClass} />
        </Field>
        <Field label="WhatsApp (com DDI e DDD, só números — ex: 5511999999999)">
          <input
            value={settings.whatsappNumber ?? ""}
            onChange={(e) => set("whatsappNumber", e.target.value.replace(/\D/g, ""))}
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Taxa de entrega (R$)">
            <input type="number" min="0" step="0.01" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Pedido mínimo (R$)">
            <input type="number" min="0" step="0.01" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} className={inputClass} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-card">
        <h2 className="font-display text-lg font-semibold text-ink-900">PIX</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Chave PIX">
            <input value={settings.pixKey ?? ""} onChange={(e) => set("pixKey", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Tipo da chave">
            <select value={settings.pixKeyType ?? ""} onChange={(e) => set("pixKeyType", e.target.value)} className={inputClass}>
              <option value="">Selecione</option>
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="email">E-mail</option>
              <option value="telefone">Telefone</option>
              <option value="aleatoria">Chave aleatória</option>
            </select>
          </Field>
        </div>
        <ImageUploader value={settings.pixQrUrl} onChange={(v) => set("pixQrUrl", v)} folder="store" label="QR Code do PIX (opcional)" />
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {saved && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">Configurações salvas!</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-soft disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar configurações"}
      </button>
    </form>
  );
}

const inputClass = "w-full rounded-xl border border-black/10 p-2.5 text-sm outline-none ring-brand-300 focus:ring-2";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  );
}
