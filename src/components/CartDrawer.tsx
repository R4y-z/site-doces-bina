import { useState } from "react";
import { Minus, Plus, Trash2, X, MessageCircle, CheckCircle2 } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { api, ApiError } from "@/lib/api";
import { cartItemTotalCents, useCartStore } from "@/store/cart";
import CheckoutForm, { type CheckoutData } from "./CheckoutForm";
import type { OrderDTO, StoreSettings } from "@/types";

type Step = "cart" | "checkout" | "success";

interface OrderResponse {
  order: OrderDTO;
  whatsappUrl: string | null;
}

export default function CartDrawer({ settings }: { settings: StoreSettings }) {
  const isOpen = useCartStore((s) => s.isOpen);
  const closeCart = useCartStore((s) => s.closeCart);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clear);
  const subtotalCents = useCartStore((s) => s.subtotalCents());

  const [step, setStep] = useState<Step>("cart");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrderResponse | null>(null);

  if (!isOpen) return null;

  function handleClose() {
    closeCart();
    if (step === "success") {
      setStep("cart");
      setResult(null);
    }
  }

  async function handleSubmitOrder(data: CheckoutData) {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        ...data,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          notes: i.notes || undefined,
          addonOptionIds: i.addons.map((a) => a.optionId),
        })),
      };
      const res = await api.post<OrderResponse>("/orders", payload);
      setResult(res);
      clearCart();
      setStep("success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar o pedido. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/50 backdrop-blur-sm sm:items-center sm:p-4">
      <button type="button" aria-label="Fechar" onClick={handleClose} className="absolute inset-0 h-full w-full" />

      <div className="relative z-10 flex max-h-[92vh] w-full animate-slide-up flex-col overflow-hidden rounded-t-3xl bg-cream-50 shadow-soft sm:max-w-md sm:rounded-3xl">
        {step !== "success" && (
          <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-ink-900">
              {step === "cart" ? "Sua sacola" : "Finalizar pedido"}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-700 hover:bg-black/5"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {step === "cart" && (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {items.length === 0 && <p className="py-10 text-center text-sm text-ink-500">Sua sacola está vazia.</p>}
              {items.map((item) => (
                <div key={item.cartItemId} className="flex gap-3 rounded-xl bg-white p-3 shadow-card">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-brand-50">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl">🍬</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug text-ink-900">{item.name}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.cartItemId)}
                        className="shrink-0 text-ink-500 hover:text-red-500"
                        aria-label="Remover item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {item.addons.length > 0 && (
                      <p className="mt-0.5 text-xs text-ink-500">{item.addons.map((a) => a.name).join(", ")}</p>
                    )}
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-full bg-cream-100 px-1.5 py-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-4 text-center text-xs font-medium">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-brand-600">
                        {formatBRL(cartItemTotalCents(item))}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {items.length > 0 && (
              <div className="shrink-0 space-y-3 border-t border-black/5 bg-cream-50 px-5 py-4 safe-bottom">
                <div className="flex justify-between font-display text-base font-semibold text-ink-900">
                  <span>Subtotal</span>
                  <span>{formatBRL(subtotalCents)}</span>
                </div>
                {!settings.isOpen && (
                  <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
                    A loja está fechada no momento. Você pode montar o pedido, mas o envio será liberado quando reabrir.
                  </p>
                )}
                <button
                  type="button"
                  disabled={!settings.isOpen}
                  onClick={() => setStep("checkout")}
                  className="w-full rounded-full bg-brand-500 py-3 text-sm font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continuar
                </button>
              </div>
            )}
          </>
        )}

        {step === "checkout" && (
          <CheckoutForm
            settings={settings}
            subtotalCents={subtotalCents}
            submitting={submitting}
            errorMessage={error}
            onBack={() => setStep("cart")}
            onSubmit={handleSubmitOrder}
          />
        )}

        {step === "success" && result && (
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center safe-bottom">
            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            <div>
              <h2 className="font-display text-xl font-semibold text-ink-900">Pedido registrado!</h2>
              <p className="mt-1 text-sm text-ink-500">
                Código <strong>#{result.order.publicCode}</strong> · Total {formatBRL(result.order.totalCents)}
              </p>
            </div>
            <p className="text-sm text-ink-700">
              Agora é só confirmar o envio pelo WhatsApp para a doceria receber os detalhes do seu pedido.
            </p>
            {result.whatsappUrl ? (
              <a
                href={result.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 py-3.5 font-semibold text-white shadow-soft"
              >
                <MessageCircle className="h-5 w-5" />
                Enviar pedido no WhatsApp
              </a>
            ) : (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                WhatsApp da loja não configurado. Entre em contato diretamente para confirmar seu pedido.
              </p>
            )}
            <button type="button" onClick={handleClose} className="text-sm font-medium text-ink-500 underline">
              Voltar ao cardápio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
