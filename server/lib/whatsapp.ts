function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  card: "Cartão na entrega",
  cash: "Dinheiro na entrega",
};

const DELIVERY_LABELS: Record<string, string> = {
  pickup: "Retirada no local",
  delivery: "Entrega a domicílio",
};

interface OrderLike {
  publicCode: string;
  customerName: string;
  customerPhone: string;
  deliveryType: "pickup" | "delivery";
  address: string | null;
  neighborhood: string | null;
  referencePoint: string | null;
  paymentMethod: "pix" | "card" | "cash";
  changeForCents: number | null;
  notes: string | null;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  items: {
    productName: string;
    unitPriceCents: number;
    quantity: number;
    notes: string | null;
    addons: { name: string; priceCents: number }[];
  }[];
}

export function buildWhatsAppMessage({ order, storeName }: { order: OrderLike; storeName: string }): string {
  const lines: string[] = [];
  lines.push(`*Novo pedido - ${storeName}*`);
  lines.push(`Código: #${order.publicCode}`);
  lines.push("");
  lines.push("*Itens:*");
  for (const item of order.items) {
    lines.push(`• ${item.quantity}x ${item.productName} — ${formatBRL(item.unitPriceCents * item.quantity)}`);
    for (const addon of item.addons) {
      lines.push(`   + ${addon.name}${addon.priceCents ? ` (${formatBRL(addon.priceCents)})` : ""}`);
    }
    if (item.notes) lines.push(`   obs: ${item.notes}`);
  }
  lines.push("");
  lines.push(`Subtotal: ${formatBRL(order.subtotalCents)}`);
  if (order.deliveryFeeCents > 0) lines.push(`Taxa de entrega: ${formatBRL(order.deliveryFeeCents)}`);
  lines.push(`*Total: ${formatBRL(order.totalCents)}*`);
  lines.push("");
  lines.push(`*Cliente:* ${order.customerName}`);
  lines.push(`*Telefone:* ${order.customerPhone}`);
  lines.push(`*Entrega:* ${DELIVERY_LABELS[order.deliveryType]}`);
  if (order.deliveryType === "delivery") {
    lines.push(`*Endereço:* ${order.address ?? ""}`);
    if (order.neighborhood) lines.push(`*Bairro:* ${order.neighborhood}`);
    if (order.referencePoint) lines.push(`*Referência:* ${order.referencePoint}`);
  }
  lines.push(`*Pagamento:* ${PAYMENT_LABELS[order.paymentMethod]}`);
  if (order.paymentMethod === "cash" && order.changeForCents) {
    lines.push(`*Troco para:* ${formatBRL(order.changeForCents)}`);
  }
  if (order.notes) {
    lines.push("");
    lines.push(`*Observações:* ${order.notes}`);
  }

  return lines.join("\n");
}

export function buildWhatsAppUrl(whatsappNumber: string, message: string): string {
  const digits = whatsappNumber.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
