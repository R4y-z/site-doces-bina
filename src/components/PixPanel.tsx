import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { StoreSettings } from "@/types";

export default function PixPanel({ settings }: { settings: StoreSettings }) {
  const [copied, setCopied] = useState(false);

  if (!settings.pixKey) {
    return (
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
        A loja ainda não configurou uma chave PIX. Escolha outra forma de pagamento ou combine o pagamento por
        WhatsApp após enviar o pedido.
      </p>
    );
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(settings.pixKey ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponível — usuário pode selecionar o texto manualmente.
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-black/5 bg-white p-4 text-center">
      {settings.pixQrUrl && (
        <img src={settings.pixQrUrl} alt="QR Code PIX" className="h-44 w-44 rounded-lg object-contain" />
      )}
      <div className="w-full">
        <p className="text-xs text-ink-500">
          Chave PIX {settings.pixKeyType ? `(${settings.pixKeyType})` : ""}
        </p>
        <div className="mt-1 flex items-center gap-2 rounded-lg bg-cream-100 px-3 py-2">
          <code className="flex-1 truncate text-left text-sm text-ink-900">{settings.pixKey}</code>
          <button
            type="button"
            onClick={handleCopy}
            className="flex shrink-0 items-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-medium text-white"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>
      <p className="text-xs text-ink-500">
        Pague antes de enviar o pedido e leve o comprovante — o resumo será enviado via WhatsApp.
      </p>
    </div>
  );
}
