import { formatBRL } from "./format";
import type { OrderDTO } from "@/types";

// Largura padrão pra bobina de 58mm (~32 colunas na fonte monoespaçada
// que os apps de impressora térmica usam pra texto puro). Se um dia trocar
// pra impressora de 80mm, é só chamar buildReceiptText(order, storeName, 48).
export const RECEIPT_WIDTH_58MM = 32;

const DELIVERY_LABELS: Record<string, string> = {
  pickup: "Retirada no local",
  delivery: "Entrega a domicílio",
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  card: "Cartão na entrega",
  cash: "Dinheiro na entrega",
};

function center(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const padding = width - text.length;
  const left = Math.floor(padding / 2);
  return " ".repeat(left) + text;
}

function divider(width: number, char = "-"): string {
  return char.repeat(width);
}

// Quebra uma linha longa em múltiplas linhas sem cortar palavras no meio.
function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > width) {
      if (current) lines.push(current);
      current = word.length > width ? word.slice(0, width) : word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

// Label à esquerda, valor à direita, alinhados na largura da bobina.
// Se não couber tudo numa linha, o valor desce pra linha de baixo.
function twoColumn(label: string, value: string, width: number): string {
  const totalLength = label.length + value.length;
  if (totalLength + 1 > width) {
    return `${label}\n${" ".repeat(Math.max(0, width - value.length))}${value}`;
  }
  return label + " ".repeat(width - totalLength) + value;
}

export function buildReceiptText(order: OrderDTO, storeName: string, width: number = RECEIPT_WIDTH_58MM): string {
  const lines: string[] = [];

  lines.push(center(storeName.toUpperCase(), width));
  if (order.isManualEntry) {
    lines.push(center("*** LANÇADO MANUALMENTE ***", width));
  }
  lines.push(divider(width));
  lines.push(`Pedido #${order.publicCode}`);
  lines.push(new Date(order.createdAt).toLocaleString("pt-BR"));
  lines.push(divider(width));

  lines.push(`Cliente: ${order.customerName}`);
  if (order.customerPhone) lines.push(`Tel: ${order.customerPhone}`);
  lines.push(divider(width));

  for (const item of order.items) {
    const qtyName = `${item.quantity}x ${item.productName}`;
    const priceStr = formatBRL(item.unitPriceCents * item.quantity);
    for (const wrapped of wrap(qtyName, width - priceStr.length - 1)) {
      lines.push(wrapped);
    }
    lines[lines.length - 1] = twoColumn(lines[lines.length - 1], priceStr, width);

    for (const addon of item.addons) {
      for (const wrapped of wrap(`  + ${addon.name}`, width)) lines.push(wrapped);
    }
    if (item.notes) {
      for (const wrapped of wrap(`  obs: ${item.notes}`, width)) lines.push(wrapped);
    }
  }
  lines.push(divider(width));

  lines.push(twoColumn("Subtotal:", formatBRL(order.subtotalCents), width));
  if (order.deliveryFeeCents > 0) {
    lines.push(twoColumn("Entrega:", formatBRL(order.deliveryFeeCents), width));
  }
  lines.push(twoColumn("TOTAL:", formatBRL(order.totalCents), width));
  lines.push(divider(width));

  lines.push(`Entrega: ${DELIVERY_LABELS[order.deliveryType] ?? order.deliveryType}`);
  if (order.deliveryType === "delivery" && order.address) {
    for (const wrapped of wrap(`End: ${order.address}${order.neighborhood ? " - " + order.neighborhood : ""}`, width)) {
      lines.push(wrapped);
    }
    if (order.referencePoint) {
      for (const wrapped of wrap(`Ref: ${order.referencePoint}`, width)) lines.push(wrapped);
    }
  }
  lines.push(`Pagamento: ${PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}`);
  if (order.paymentMethod === "cash" && order.changeForCents) {
    lines.push(`Troco para: ${formatBRL(order.changeForCents)}`);
  }
  if (order.notes) {
    lines.push(divider(width));
    for (const wrapped of wrap(`Obs: ${order.notes}`, width)) lines.push(wrapped);
  }

  lines.push(divider(width));
  lines.push(center("Obrigado pela preferência!", width));
  lines.push("");
  lines.push("");

  return lines.join("\n");
}
