import { Hono } from "hono";
import type { Transaction } from "@libsql/client";
import type { HonoEnv } from "../types.js";
import { requireAdmin, getSessionAdmin } from "../middleware/auth.js";
import { getDb } from "../lib/db.js";
import { mapOrder, mapOrderItem } from "../lib/mappers.js";
import { generatePublicCode } from "../lib/slug.js";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "../lib/whatsapp.js";

export const orderRoutes = new Hono<HonoEnv>();

interface CartItemInput {
  productId: number;
  quantity: number;
  notes?: string;
  addonOptionIds?: number[];
}

interface CreateOrderInput {
  customerName: string;
  customerPhone?: string;
  deliveryType: "pickup" | "delivery";
  address?: string;
  neighborhood?: string;
  referencePoint?: string;
  paymentMethod: "pix" | "card" | "cash";
  changeForCents?: number;
  notes?: string;
  items: CartItemInput[];
  // Só é honrado se a request vier autenticada como admin (ver checagem
  // abaixo) — sem isso, qualquer cliente poderia forjar esse campo.
  isManualEntry?: boolean;
}

class InsufficientStockError extends Error {
  constructor(public productName: string) {
    super(`Estoque insuficiente para ${productName}`);
  }
}

async function loadOrderWithItems(orderId: number) {
  const db = getDb();
  const orderResult = await db.execute({ sql: "SELECT * FROM orders WHERE id = ?", args: [orderId] });
  const orderRow = orderResult.rows[0];
  if (!orderRow) return null;

  const itemsResult = await db.execute({
    sql: "SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC",
    args: [orderId],
  });
  const itemRows = itemsResult.rows as any[];

  const itemIds = itemRows.map((i) => i.id);
  let addonRows: any[] = [];
  if (itemIds.length > 0) {
    const placeholders = itemIds.map(() => "?").join(",");
    const addonsResult = await db.execute({
      sql: `SELECT * FROM order_item_addons WHERE order_item_id IN (${placeholders})`,
      args: itemIds,
    });
    addonRows = addonsResult.rows as any[];
  }

  const addonsByItem = new Map<number, any[]>();
  for (const a of addonRows) {
    const list = addonsByItem.get(a.order_item_id) ?? [];
    list.push(a);
    addonsByItem.set(a.order_item_id, list);
  }

  const items = itemRows.map((i) => mapOrderItem(i, addonsByItem.get(i.id) ?? []));
  return mapOrder(orderRow, items);
}

// POST /api/orders — endpoint público usado pelo checkout do cliente, e
// também pelo lançamento manual de pedidos no admin (isManualEntry: true,
// exige sessão de admin válida). Recalcula preços e estoque a partir do
// banco (nunca confia nos valores enviados pelo front) para evitar
// manipulação de preço no client.
orderRoutes.post("/", async (c) => {
  const body = (await c.req.json().catch(() => null)) as CreateOrderInput | null;

  if (!body?.customerName || !body?.deliveryType || !body?.paymentMethod) {
    return c.json({ error: "Dados do pedido incompletos." }, 400);
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return c.json({ error: "O carrinho está vazio." }, 400);
  }
  if (body.deliveryType === "delivery" && !body.address) {
    return c.json({ error: "Endereço é obrigatório para entrega." }, 400);
  }

  const isManualEntry = body.isManualEntry === true;
  if (isManualEntry) {
    const admin = await getSessionAdmin(c);
    if (!admin) return c.json({ error: "Não autenticado." }, 401);
  } else if (!body.customerPhone) {
    return c.json({ error: "Telefone é obrigatório." }, 400);
  }

  const db = getDb();

  const settingsResult = await db.execute("SELECT * FROM store_settings WHERE id = 1");
  const settings = settingsResult.rows[0] as any;
  if (!settings) return c.json({ error: "Loja não configurada." }, 500);
  // Pedido lançado manualmente pelo admin não é bloqueado pelo status
  // "fechada" — é um atendimento por telefone/presencial, não pelo site.
  if (!settings.is_open && !isManualEntry) {
    return c.json({ error: "A loja está fechada no momento." }, 409);
  }

  // Monta os itens validados com preço e estoque vindos do banco.
  const resolvedItems: {
    productId: number;
    productName: string;
    unitPriceCents: number;
    quantity: number;
    notes: string | null;
    addons: { name: string; priceCents: number }[];
    stockQuantity: number | null;
  }[] = [];

  const stockErrors: string[] = [];

  for (const item of body.items) {
    const productResult = await db.execute({
      sql: "SELECT * FROM products WHERE id = ? AND active = 1",
      args: [item.productId],
    });
    const product = productResult.rows[0] as any;
    if (!product) return c.json({ error: `Produto ${item.productId} não encontrado ou indisponível.` }, 400);

    const quantity = Math.max(1, Number(item.quantity) || 1);

    if (product.stock_quantity !== null && (product.stock_quantity as number) < quantity) {
      stockErrors.push(product.name as string);
    }

    let unitPriceCents = product.price_cents as number;

    const addons: { name: string; priceCents: number }[] = [];
    const optionIds = item.addonOptionIds ?? [];
    for (const optionId of optionIds) {
      const optionResult = await db.execute({
        sql: `SELECT ao.* FROM addon_options ao
         JOIN addon_groups ag ON ag.id = ao.group_id
         WHERE ao.id = ? AND ag.product_id = ? AND ao.active = 1`,
        args: [optionId, item.productId],
      });
      const option = optionResult.rows[0] as any;
      if (!option) continue;
      addons.push({ name: option.name, priceCents: option.price_cents });
      unitPriceCents += option.price_cents;
    }

    resolvedItems.push({
      productId: product.id,
      productName: product.name,
      unitPriceCents,
      quantity,
      notes: item.notes?.trim() || null,
      addons,
      stockQuantity: product.stock_quantity === null ? null : Number(product.stock_quantity),
    });
  }

  if (stockErrors.length > 0) {
    return c.json({ error: `Estoque insuficiente para: ${stockErrors.join(", ")}.` }, 400);
  }

  const subtotalCents = resolvedItems.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
  const deliveryFeeCents = body.deliveryType === "delivery" ? (settings.delivery_fee_cents as number) : 0;
  const totalCents = subtotalCents + deliveryFeeCents;

  if (settings.min_order_cents && subtotalCents < settings.min_order_cents) {
    return c.json({ error: "Pedido abaixo do valor mínimo." }, 400);
  }

  let publicCode = generatePublicCode();
  for (let attempts = 0; attempts < 5; attempts++) {
    const clashResult = await db.execute({ sql: "SELECT id FROM orders WHERE public_code = ?", args: [publicCode] });
    if (!clashResult.rows[0]) break;
    publicCode = generatePublicCode();
  }

  // A partir daqui roda tudo dentro de uma transação: se o estoque de algum
  // item acabar entre a checagem acima e agora (corrida entre dois pedidos
  // simultâneos), a atualização condicional abaixo afeta 0 linhas e
  // desfazemos o pedido inteiro, sem deixar nada parcialmente gravado.
  // A própria abertura da transação (tx.transaction) pode falhar sob
  // contenção de escrita, então também fica dentro do try.
  let tx: Transaction | undefined;
  let orderId: number;
  try {
    tx = await db.transaction("write");

    for (const item of resolvedItems) {
      if (item.stockQuantity === null) continue;
      const decrement = await tx.execute({
        sql: "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?",
        args: [item.quantity, item.productId, item.quantity],
      });
      if (decrement.rowsAffected === 0) {
        throw new InsufficientStockError(item.productName);
      }
    }

    const orderResult = await tx.execute({
      sql: `INSERT INTO orders (public_code, customer_name, customer_phone, delivery_type, address, neighborhood,
         reference_point, payment_method, change_for_cents, notes, subtotal_cents, delivery_fee_cents, total_cents, status, is_manual_entry)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?)`,
      args: [
        publicCode,
        body.customerName,
        body.customerPhone?.trim() || "",
        body.deliveryType,
        body.address ?? null,
        body.neighborhood ?? null,
        body.referencePoint ?? null,
        body.paymentMethod,
        body.paymentMethod === "cash" ? Number(body.changeForCents ?? 0) || null : null,
        body.notes?.trim() || null,
        subtotalCents,
        deliveryFeeCents,
        totalCents,
        isManualEntry ? 1 : 0,
      ],
    });

    orderId = Number(orderResult.lastInsertRowid);

    for (const item of resolvedItems) {
      const itemResult = await tx.execute({
        sql: "INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity, notes) VALUES (?, ?, ?, ?, ?, ?)",
        args: [orderId, item.productId, item.productName, item.unitPriceCents, item.quantity, item.notes],
      });
      const orderItemId = Number(itemResult.lastInsertRowid);

      for (const addon of item.addons) {
        await tx.execute({
          sql: "INSERT INTO order_item_addons (order_item_id, addon_name, price_cents) VALUES (?, ?, ?)",
          args: [orderItemId, addon.name, addon.priceCents],
        });
      }
    }

    await tx.commit();
  } catch (err) {
    await tx?.rollback().catch(() => {});

    if (err instanceof InsufficientStockError) {
      return c.json(
        { error: `Estoque insuficiente para ${err.productName} (esgotou durante a confirmação, tente novamente).` },
        409
      );
    }
    // Contenção de escrita (comum sob concorrência alta, ex: vários
    // pedidos disputando a última unidade ao mesmo tempo): trata como
    // condição transitória em vez de erro genérico de servidor.
    if ((err as any)?.code === "SQLITE_BUSY") {
      return c.json({ error: "Muita gente comprando ao mesmo tempo — tente novamente em alguns segundos." }, 409);
    }
    throw err;
  }

  const order = await loadOrderWithItems(orderId);

  const message = buildWhatsAppMessage({
    order: order!,
    storeName: settings.store_name,
  });
  const whatsappUrl = settings.whatsapp_number ? buildWhatsAppUrl(settings.whatsapp_number, message) : null;

  return c.json({ order, whatsappUrl }, 201);
});

// --- Rotas administrativas -------------------------------------------------

orderRoutes.get("/admin", requireAdmin, async (c) => {
  const status = c.req.query("status");
  const db = getDb();
  const result = status
    ? await db.execute({ sql: "SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT 200", args: [status] })
    : await db.execute("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200");

  const orders = (result.rows as any[]).map((r) => mapOrder(r));
  return c.json({ orders });
});

orderRoutes.get("/admin/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const order = await loadOrderWithItems(id);
  if (!order) return c.json({ error: "Pedido não encontrado." }, 404);
  return c.json({ order });
});

const VALID_STATUSES = ["received", "confirmed", "preparing", "out_for_delivery", "ready", "completed", "cancelled"];

orderRoutes.patch("/admin/:id/status", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => null);
  if (!body?.status || !VALID_STATUSES.includes(body.status)) {
    return c.json({ error: "Status inválido." }, 400);
  }

  const db = getDb();
  await db.execute({
    sql: "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?",
    args: [body.status, id],
  });

  const order = await loadOrderWithItems(id);
  if (!order) return c.json({ error: "Pedido não encontrado." }, 404);
  return c.json({ order });
});
