import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { requireAdmin } from "../middleware/auth";
import { mapOrder, mapOrderItem } from "../lib/mappers";
import { generatePublicCode } from "../lib/slug";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "../lib/whatsapp";

export const orderRoutes = new Hono<HonoEnv>();

interface CartItemInput {
  productId: number;
  quantity: number;
  notes?: string;
  addonOptionIds?: number[];
}

interface CreateOrderInput {
  customerName: string;
  customerPhone: string;
  deliveryType: "pickup" | "delivery";
  address?: string;
  neighborhood?: string;
  referencePoint?: string;
  paymentMethod: "pix" | "card" | "cash";
  changeForCents?: number;
  notes?: string;
  items: CartItemInput[];
}

async function loadOrderWithItems(DB: D1Database, orderId: number) {
  const orderRow = await DB.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first();
  if (!orderRow) return null;

  const itemRows = (await DB.prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC").bind(orderId).all())
    .results as any[];

  const itemIds = itemRows.map((i) => i.id);
  let addonRows: any[] = [];
  if (itemIds.length > 0) {
    const placeholders = itemIds.map(() => "?").join(",");
    addonRows = (
      await DB.prepare(`SELECT * FROM order_item_addons WHERE order_item_id IN (${placeholders})`)
        .bind(...itemIds)
        .all()
    ).results as any[];
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

// POST /api/orders — endpoint público usado pelo checkout do cliente.
// Recalcula preços a partir do banco (nunca confia nos valores enviados
// pelo front) para evitar manipulação de preço no client.
orderRoutes.post("/", async (c) => {
  const body = (await c.req.json().catch(() => null)) as CreateOrderInput | null;

  if (!body?.customerName || !body?.customerPhone || !body?.deliveryType || !body?.paymentMethod) {
    return c.json({ error: "Dados do pedido incompletos." }, 400);
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return c.json({ error: "O carrinho está vazio." }, 400);
  }
  if (body.deliveryType === "delivery" && !body.address) {
    return c.json({ error: "Endereço é obrigatório para entrega." }, 400);
  }

  const { DB } = c.env;

  const settings = await DB.prepare("SELECT * FROM store_settings WHERE id = 1").first<any>();
  if (!settings) return c.json({ error: "Loja não configurada." }, 500);
  if (!settings.is_open) return c.json({ error: "A loja está fechada no momento." }, 409);

  // Monta os itens validados com preço vindo do banco.
  const resolvedItems: {
    productId: number;
    productName: string;
    unitPriceCents: number;
    quantity: number;
    notes: string | null;
    addons: { name: string; priceCents: number }[];
  }[] = [];

  for (const item of body.items) {
    const product = await DB.prepare("SELECT * FROM products WHERE id = ? AND active = 1")
      .bind(item.productId)
      .first<any>();
    if (!product) return c.json({ error: `Produto ${item.productId} não encontrado ou indisponível.` }, 400);

    const quantity = Math.max(1, Number(item.quantity) || 1);
    let unitPriceCents = product.price_cents as number;

    const addons: { name: string; priceCents: number }[] = [];
    const optionIds = item.addonOptionIds ?? [];
    for (const optionId of optionIds) {
      const option = await DB.prepare(
        `SELECT ao.* FROM addon_options ao
         JOIN addon_groups ag ON ag.id = ao.group_id
         WHERE ao.id = ? AND ag.product_id = ? AND ao.active = 1`
      )
        .bind(optionId, item.productId)
        .first<any>();
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
    });
  }

  const subtotalCents = resolvedItems.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
  const deliveryFeeCents = body.deliveryType === "delivery" ? (settings.delivery_fee_cents as number) : 0;
  const totalCents = subtotalCents + deliveryFeeCents;

  if (settings.min_order_cents && subtotalCents < settings.min_order_cents) {
    return c.json({ error: "Pedido abaixo do valor mínimo." }, 400);
  }

  let publicCode = generatePublicCode();
  for (let attempts = 0; attempts < 5; attempts++) {
    const clash = await DB.prepare("SELECT id FROM orders WHERE public_code = ?").bind(publicCode).first();
    if (!clash) break;
    publicCode = generatePublicCode();
  }

  const orderResult = await DB.prepare(
    `INSERT INTO orders (public_code, customer_name, customer_phone, delivery_type, address, neighborhood,
       reference_point, payment_method, change_for_cents, notes, subtotal_cents, delivery_fee_cents, total_cents, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received')`
  )
    .bind(
      publicCode,
      body.customerName,
      body.customerPhone,
      body.deliveryType,
      body.address ?? null,
      body.neighborhood ?? null,
      body.referencePoint ?? null,
      body.paymentMethod,
      body.paymentMethod === "cash" ? Number(body.changeForCents ?? 0) || null : null,
      body.notes?.trim() || null,
      subtotalCents,
      deliveryFeeCents,
      totalCents
    )
    .run();

  const orderId = orderResult.meta.last_row_id as number;

  for (const item of resolvedItems) {
    const itemResult = await DB.prepare(
      "INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity, notes) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(orderId, item.productId, item.productName, item.unitPriceCents, item.quantity, item.notes)
      .run();
    const orderItemId = itemResult.meta.last_row_id as number;

    for (const addon of item.addons) {
      await DB.prepare("INSERT INTO order_item_addons (order_item_id, addon_name, price_cents) VALUES (?, ?, ?)")
        .bind(orderItemId, addon.name, addon.priceCents)
        .run();
    }
  }

  const order = await loadOrderWithItems(DB, orderId);

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
  const stmt = status
    ? c.env.DB.prepare("SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT 200").bind(status)
    : c.env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200");

  const rows = (await stmt.all()).results as any[];
  const orders = rows.map((r) => mapOrder(r));
  return c.json({ orders });
});

orderRoutes.get("/admin/:id", requireAdmin, async (c) => {
  const id = Number(c.req.param("id"));
  const order = await loadOrderWithItems(c.env.DB, id);
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

  await c.env.DB.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(body.status, id)
    .run();

  const order = await loadOrderWithItems(c.env.DB, id);
  if (!order) return c.json({ error: "Pedido não encontrado." }, 404);
  return c.json({ order });
});
