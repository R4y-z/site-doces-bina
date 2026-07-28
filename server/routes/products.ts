import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { requireAdmin } from "../middleware/auth";
import { mapAddonGroup, mapProduct } from "../lib/mappers";
import { slugify } from "../lib/slug";

export const productRoutes = new Hono<HonoEnv>();

productRoutes.use("*", requireAdmin);

async function loadAddonGroupsForProduct(DB: D1Database, productId: number) {
  const groups = await DB.prepare("SELECT * FROM addon_groups WHERE product_id = ? ORDER BY sort_order ASC, id ASC")
    .bind(productId)
    .all();
  const groupRows = groups.results as any[];
  if (groupRows.length === 0) return [];

  const groupIds = groupRows.map((g) => g.id);
  const placeholders = groupIds.map(() => "?").join(",");
  const options = await DB.prepare(
    `SELECT * FROM addon_options WHERE group_id IN (${placeholders}) ORDER BY sort_order ASC, id ASC`
  )
    .bind(...groupIds)
    .all();
  const optionRows = options.results as any[];

  const byGroup = new Map<number, any[]>();
  for (const o of optionRows) {
    const list = byGroup.get(o.group_id) ?? [];
    list.push(o);
    byGroup.set(o.group_id, list);
  }

  return groupRows.map((g) => mapAddonGroup(g, byGroup.get(g.id) ?? []));
}

productRoutes.get("/", async (c) => {
  const rows = await c.env.DB.prepare("SELECT * FROM products ORDER BY sort_order ASC, name ASC").all();
  const products = await Promise.all(
    (rows.results as any[]).map(async (p) => mapProduct(p, await loadAddonGroupsForProduct(c.env.DB, p.id)))
  );
  return c.json({ products });
});

productRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const row = await c.env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
  if (!row) return c.json({ error: "Produto não encontrado." }, 404);
  const addonGroups = await loadAddonGroupsForProduct(c.env.DB, id);
  return c.json({ product: mapProduct(row, addonGroups) });
});

interface AddonGroupInput {
  name: string;
  required?: boolean;
  multiple?: boolean;
  minSelect?: number;
  maxSelect?: number;
  options: { name: string; priceCents?: number; active?: boolean }[];
}

async function replaceAddonGroups(DB: D1Database, productId: number, groups: AddonGroupInput[]) {
  await DB.prepare("DELETE FROM addon_groups WHERE product_id = ?").bind(productId).run();

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (!g.name) continue;
    const result = await DB.prepare(
      "INSERT INTO addon_groups (product_id, name, required, multiple, min_select, max_select, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        productId,
        g.name,
        g.required ? 1 : 0,
        g.multiple ? 1 : 0,
        Number(g.minSelect ?? 0),
        Number(g.maxSelect ?? 1),
        i
      )
      .run();
    const groupId = result.meta.last_row_id;

    const options = g.options ?? [];
    for (let j = 0; j < options.length; j++) {
      const opt = options[j];
      if (!opt.name) continue;
      await DB.prepare(
        "INSERT INTO addon_options (group_id, name, price_cents, active, sort_order) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(groupId, opt.name, Number(opt.priceCents ?? 0), opt.active === false ? 0 : 1, j)
        .run();
    }
  }
}

productRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.name || !body?.categoryId || body?.priceCents === undefined) {
    return c.json({ error: "name, categoryId e priceCents são obrigatórios." }, 400);
  }

  const slug = body.slug ? slugify(body.slug) : slugify(body.name);

  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO products (category_id, name, slug, description, price_cents, image_url, featured, active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        Number(body.categoryId),
        body.name,
        slug,
        body.description ?? "",
        Number(body.priceCents),
        body.imageUrl ?? null,
        body.featured ? 1 : 0,
        body.active === false ? 0 : 1,
        Number(body.sortOrder ?? 0)
      )
      .run();

    const productId = result.meta.last_row_id as number;

    if (Array.isArray(body.addonGroups) && body.addonGroups.length > 0) {
      await replaceAddonGroups(c.env.DB, productId, body.addonGroups);
    }

    const row = await c.env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(productId).first();
    const addonGroups = await loadAddonGroupsForProduct(c.env.DB, productId);
    return c.json({ product: mapProduct(row, addonGroups) }, 201);
  } catch (err: any) {
    if (String(err?.message ?? "").includes("UNIQUE")) {
      return c.json({ error: "Já existe um produto com esse slug." }, 409);
    }
    throw err;
  }
});

productRoutes.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Payload inválido." }, 400);

  const existing = await c.env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first<any>();
  if (!existing) return c.json({ error: "Produto não encontrado." }, 404);

  const slug = body.slug ? slugify(body.slug) : existing.slug;

  await c.env.DB.prepare(
    `UPDATE products SET category_id = ?, name = ?, slug = ?, description = ?, price_cents = ?, image_url = ?,
       featured = ?, active = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?`
  )
    .bind(
      Number(body.categoryId ?? existing.category_id),
      body.name ?? existing.name,
      slug,
      body.description ?? existing.description,
      Number(body.priceCents ?? existing.price_cents),
      body.imageUrl !== undefined ? body.imageUrl : existing.image_url,
      body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured,
      body.active !== undefined ? (body.active ? 1 : 0) : existing.active,
      Number(body.sortOrder ?? existing.sort_order),
      id
    )
    .run();

  if (Array.isArray(body.addonGroups)) {
    await replaceAddonGroups(c.env.DB, id, body.addonGroups);
  }

  const row = await c.env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).first();
  const addonGroups = await loadAddonGroupsForProduct(c.env.DB, id);
  return c.json({ product: mapProduct(row, addonGroups) });
});

productRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await c.env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
