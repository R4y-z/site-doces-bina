import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { requireAdmin } from "../middleware/auth";

export const settingsRoutes = new Hono<HonoEnv>();

settingsRoutes.use("*", requireAdmin);

// Retorna todas as configurações (inclusive dados sensíveis como chave PIX)
// para edição no painel admin.
settingsRoutes.get("/", async (c) => {
  const row = await c.env.DB.prepare("SELECT * FROM store_settings WHERE id = 1").first<any>();
  if (!row) return c.json({ error: "Configurações não encontradas." }, 404);

  return c.json({
    settings: {
      storeName: row.store_name,
      tagline: row.tagline,
      logoUrl: row.logo_url,
      bannerUrl: row.banner_url,
      isOpen: !!row.is_open,
      address: row.address,
      hoursText: row.hours_text,
      whatsappNumber: row.whatsapp_number,
      deliveryFeeCents: row.delivery_fee_cents,
      minOrderCents: row.min_order_cents,
      pixKey: row.pix_key,
      pixKeyType: row.pix_key_type,
      pixQrUrl: row.pix_qr_url,
    },
  });
});

settingsRoutes.put("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Payload inválido." }, 400);

  const existing = await c.env.DB.prepare("SELECT * FROM store_settings WHERE id = 1").first<any>();
  if (!existing) return c.json({ error: "Configurações não encontradas." }, 404);

  const merged = {
    store_name: body.storeName ?? existing.store_name,
    tagline: body.tagline ?? existing.tagline,
    logo_url: body.logoUrl !== undefined ? body.logoUrl : existing.logo_url,
    banner_url: body.bannerUrl !== undefined ? body.bannerUrl : existing.banner_url,
    is_open: body.isOpen !== undefined ? (body.isOpen ? 1 : 0) : existing.is_open,
    address: body.address ?? existing.address,
    hours_text: body.hoursText ?? existing.hours_text,
    whatsapp_number: body.whatsappNumber ?? existing.whatsapp_number,
    delivery_fee_cents: body.deliveryFeeCents !== undefined ? Number(body.deliveryFeeCents) : existing.delivery_fee_cents,
    min_order_cents: body.minOrderCents !== undefined ? Number(body.minOrderCents) : existing.min_order_cents,
    pix_key: body.pixKey !== undefined ? body.pixKey : existing.pix_key,
    pix_key_type: body.pixKeyType !== undefined ? body.pixKeyType : existing.pix_key_type,
    pix_qr_url: body.pixQrUrl !== undefined ? body.pixQrUrl : existing.pix_qr_url,
  };

  await c.env.DB.prepare(
    `UPDATE store_settings SET store_name = ?, tagline = ?, logo_url = ?, banner_url = ?, is_open = ?, address = ?,
       hours_text = ?, whatsapp_number = ?, delivery_fee_cents = ?, min_order_cents = ?, pix_key = ?, pix_key_type = ?,
       pix_qr_url = ?, updated_at = datetime('now') WHERE id = 1`
  )
    .bind(
      merged.store_name,
      merged.tagline,
      merged.logo_url,
      merged.banner_url,
      merged.is_open,
      merged.address,
      merged.hours_text,
      merged.whatsapp_number,
      merged.delivery_fee_cents,
      merged.min_order_cents,
      merged.pix_key,
      merged.pix_key_type,
      merged.pix_qr_url
    )
    .run();

  return c.json({ ok: true });
});

// Atalho para abrir/fechar a loja rapidamente pelo dashboard.
settingsRoutes.post("/toggle-open", async (c) => {
  const row = await c.env.DB.prepare("SELECT is_open FROM store_settings WHERE id = 1").first<{ is_open: number }>();
  const next = row?.is_open ? 0 : 1;
  await c.env.DB.prepare("UPDATE store_settings SET is_open = ?, updated_at = datetime('now') WHERE id = 1")
    .bind(next)
    .run();
  return c.json({ isOpen: !!next });
});
