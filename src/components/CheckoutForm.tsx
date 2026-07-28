import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { Bike, Store } from "lucide-react";
import { formatBRL, parseBRLInputToCents } from "@/lib/format";
import PixPanel from "./PixPanel";
import type { DeliveryType, PaymentMethod, StoreSettings } from "@/types";

export interface CheckoutData {
  customerName: string;
  customerPhone: string;
  deliveryType: DeliveryType;
  address: string;
  neighborhood: string;
  referencePoint: string;
  paymentMethod: PaymentMethod;
  changeForCents: number;
  notes: string;
}

interface Props {
  settings: StoreSettings;
  subtotalCents: number;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (data: CheckoutData) => void;
  onBack: () => void;
}

const initialState: CheckoutData = {
  customerName: "",
  customerPhone: "",
  deliveryType: "pickup",
  address: "",
  neighborhood: "",
  referencePoint: "",
  paymentMethod: "pix",
  changeForCents: 0,
  notes: "",
};

export default function CheckoutForm({ settings, subtotalCents, submitting, errorMessage, onSubmit, onBack }: Props) {
  const [data, setData] = useState<CheckoutData>(initialState);
  const [changeInput, setChangeInput] = useState("");

  const deliveryFee = data.deliveryType === "delivery" ? settings.deliveryFeeCents : 0;
  const total = subtotalCents + deliveryFee;

  const isValid =
    data.customerName.trim().length > 1 &&
    data.customerPhone.trim().length >= 8 &&
    (data.deliveryType === "pickup" || data.address.trim().length > 3);

  function set<K extends keyof CheckoutData>(key: K, value: CheckoutData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;
    onSubmit(data);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink-900">Seus dados</h3>
          <div className="space-y-2.5">
            <input
              required
              value={data.customerName}
              onChange={(e) => set("customerName", e.target.value)}
              placeholder="Seu nome"
              className="w-full rounded-xl border border-black/5 bg-white p-3 text-sm outline-none ring-brand-300 focus:ring-2"
            />
            <input
              required
              type="tel"
              inputMode="tel"
              value={data.customerPhone}
              onChange={(e) => set("customerPhone", e.target.value)}
              placeholder="WhatsApp / Telefone com DDD"
              className="w-full rounded-xl border border-black/5 bg-white p-3 text-sm outline-none ring-brand-300 focus:ring-2"
            />
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink-900">Entrega</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => set("deliveryType", "pickup")}
              className={clsx(
                "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium",
                data.deliveryType === "pickup" ? "border-brand-400 bg-brand-50 text-brand-700" : "border-black/5 bg-white text-ink-700"
              )}
            >
              <Store className="h-5 w-5" />
              Retirar no local
            </button>
            <button
              type="button"
              onClick={() => set("deliveryType", "delivery")}
              className={clsx(
                "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium",
                data.deliveryType === "delivery" ? "border-brand-400 bg-brand-50 text-brand-700" : "border-black/5 bg-white text-ink-700"
              )}
            >
              <Bike className="h-5 w-5" />
              Entrega ({settings.deliveryFeeCents > 0 ? formatBRL(settings.deliveryFeeCents) : "grátis"})
            </button>
          </div>

          {data.deliveryType === "delivery" && (
            <div className="mt-2.5 space-y-2.5">
              <input
                required
                value={data.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Endereço completo (rua, número, complemento)"
                className="w-full rounded-xl border border-black/5 bg-white p-3 text-sm outline-none ring-brand-300 focus:ring-2"
              />
              <input
                value={data.neighborhood}
                onChange={(e) => set("neighborhood", e.target.value)}
                placeholder="Bairro"
                className="w-full rounded-xl border border-black/5 bg-white p-3 text-sm outline-none ring-brand-300 focus:ring-2"
              />
              <input
                value={data.referencePoint}
                onChange={(e) => set("referencePoint", e.target.value)}
                placeholder="Ponto de referência (opcional)"
                className="w-full rounded-xl border border-black/5 bg-white p-3 text-sm outline-none ring-brand-300 focus:ring-2"
              />
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-ink-900">Pagamento</h3>
          <div className="grid grid-cols-3 gap-2">
            {(["pix", "card", "cash"] as PaymentMethod[]).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => set("paymentMethod", method)}
                className={clsx(
                  "rounded-xl border px-2 py-2.5 text-xs font-medium",
                  data.paymentMethod === method ? "border-brand-400 bg-brand-50 text-brand-700" : "border-black/5 bg-white text-ink-700"
                )}
              >
                {method === "pix" ? "PIX" : method === "card" ? "Cartão" : "Dinheiro"}
              </button>
            ))}
          </div>

          {data.paymentMethod === "pix" && (
            <div className="mt-3">
              <PixPanel settings={settings} />
            </div>
          )}

          {data.paymentMethod === "cash" && (
            <input
              value={changeInput}
              onChange={(e) => {
                setChangeInput(e.target.value);
                set("changeForCents", parseBRLInputToCents(e.target.value));
              }}
              placeholder="Troco para quanto? (opcional, ex: 50)"
              className="mt-3 w-full rounded-xl border border-black/5 bg-white p-3 text-sm outline-none ring-brand-300 focus:ring-2"
            />
          )}
        </section>

        <section>
          <textarea
            value={data.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Observações do pedido (opcional)"
            rows={2}
            className="w-full resize-none rounded-xl border border-black/5 bg-white p-3 text-sm outline-none ring-brand-300 focus:ring-2"
          />
        </section>

        {errorMessage && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t border-black/5 bg-cream-50 px-5 py-4 safe-bottom">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-ink-500">
            <span>Subtotal</span>
            <span>{formatBRL(subtotalCents)}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between text-ink-500">
              <span>Taxa de entrega</span>
              <span>{formatBRL(deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between font-display text-base font-semibold text-ink-900">
            <span>Total</span>
            <span>{formatBRL(total)}</span>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-ink-700"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={!isValid || submitting}
            className="flex-1 rounded-full bg-brand-500 py-3 text-sm font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Enviando pedido..." : "Finalizar pedido no WhatsApp"}
          </button>
        </div>
      </div>
    </form>
  );
}
