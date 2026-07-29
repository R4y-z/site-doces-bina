import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { requireAdmin } from "../middleware/auth";
import { getDb } from "../lib/db";
import { mapAddonGroup, mapProduct } from "../lib/mappers";
import { slugify } from "../lib/slug";

export const productRoutes = new Hono<HonoEnv>();

productRoutes.use("*", requireAdmin);

async function loadAddonGroupsForProduct(productId: number) {
  const db = getDb();
  const groupsResult = await db.execute({
    sql: "SELECT * FROM addon_groups WHERE product_id = ? ORDER BY sort_order ASC, id ASC",
    args: [productId],
  });
  const groupRows = groupsResult.rows as any[];
  if (groupRows.length === 0) return [];

  const groupIds = groupRows.map((g) => g.id);
  const placeholders = groupIds.map(() => "?").join(",");
  const optionsResult = await db.execute({
    sql: `SELECT * FROM addon_options WHERE group_id IN (${placeholders}) ORDER BY sort_order ASC, id ASC`,
    args: groupIds,
  });
  const optionRows = optionsResult.rows as any[];

  const byGroup = new Map<number, any[]>();
  for (const o of optionRows) {
    const list = byGroup.get(o.group_id) ?? [];
    list.push(o);
    byGroup.set(o.group_id, list);
  }

  return groupRows.map((g) => mapAddonGroup(g, byGroup.get(g.id) ?? []));
}

productRoutes.get("/", async (c) => {
  const db = getDb();
  const result = await db.execute("SELECT * FROM products ORDER BY sort_order ASC, name ASC");
  const products = await Promise.all(
    (result.rows as any[]).map(async (p) => mapProduct(p, await loadAddonGroupsForProduct(p.id)))
  );
  return c.json({ products });
});

productRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb();
  const result = await db.execute({ sql: "SELECT * FROM products WHERE id = ?", args: [id] });
  const row = result.rows[0];
  if (!row) return c.json({ error: "Produto não encontrado." }, 404);
  const addonGroups = await loadAddonGroupsForProduct(id);
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

async function replaceAddonGroups(productId: number, groups: AddonGroupInput[]) {
  const db = getDb();
  await db.execute({ sql: "DELETE FROM addon_groups WHERE product_id = ?", args: [productId] });

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (!g.name) continue;
    const groupResult = await db.execute({
      sql: "INSERT INTO addon_groups (product_id, name, required, multiple, min_select, max_select, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [
        productId,
        g.name,
        g.required ? 1 : 0,
        g.multiple ? 1 : 0,
        Number(g.minSelect ?? 0),
        Number(g.maxSelect ?? 1),
        i,
      ],
    });
    const groupId = Number(groupResult.lastInsertRowid);

    const options = g.options ?? [];
    for (let j = 0; j < options.length; j++) {
      const opt = options[j];
      if (!opt.name) continue;
      await db.execute({
        sql: "INSERT INTO addon_options (group_id, name, price_cents, active, sort_order) VALUES (?, ?, ?, ?, ?)",
        args: [groupId, opt.name, Number(opt.priceCents ?? 0), opt.active === false ? 0 : 1, j],
      });
    }
  }
}

productRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.name || !body?.categoryId || body?.priceCents === undefined) {
    return c.json({ error: "name, categoryId e priceCents são obrigatórios." }, 400);
  }

  const slug = body.slug ? slugify(body.slug) : slugify(body.name);
  const db = getDb();

  try {
    const insertResult = await db.execute({
      sql: `INSERT INTO products (category_id, name, slug, description, price_cents, image_url, featured, active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        Number(body.categoryId),
        body.name,
        slug,
        body.description ?? "",
        Number(body.priceCents),
        body.imageUrl ?? null,
        body.featured ? 1 : 0,
        body.active === false ? 0 : 1,
        Number(body.sortOrder ?? 0),
      ],
    });

    const productId = Number(insertResult.lastInsertRowid);

    if (Array.isArray(body.addonGroups) && body.addonGroups.length > 0) {
      await replaceAddonGroups(productId, body.addonGroups);
    }

    const row = await db.execute({ sql: "SELECT * FROM products WHERE id = ?", args: [productId] });
    const addonGroups = await loadAddonGroupsForProduct(productId);
    return c.json({ product: mapProduct(row.rows[0], addonGroups) }, 201);
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

  const db = getDb();
  const existingResult = await db.execute({ sql: "SELECT * FROM products WHERE id = ?", args: [id] });
  const existing = existingResult.rows[0] as any;
  if (!existing) return c.json({ error: "Produto não encontrado." }, 404);

  const slug = body.slug ? slugify(body.slug) : existing.slug;

  await db.execute({
    sql: `UPDATE products SET category_id = ?, name = ?, slug = ?, description = ?, price_cents = ?, image_url = ?,
       featured = ?, active = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [
      Number(body.categoryId ?? existing.category_id),
      body.name ?? existing.name,
      slug,
      body.description ?? existing.description,
      Number(body.priceCents ?? existing.price_cents),
      body.imageUrl !== undefined ? body.imageUrl : existing.image_url,
      body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured,
      body.active !== undefined ? (body.active ? 1 : 0) : existing.active,
      Number(body.sortOrder ?? existing.sort_order),
      id,
    ],
  });

  if (Array.isArray(body.addonGroups)) {
    await replaceAddonGroups(id, body.addonGroups);
  }

  const row = await db.execute({ sql: "SELECT * FROM products WHERE id = ?", args: [id] });
  const addonGroups = await loadAddonGroupsForProduct(id);
  return c.json({ product: mapProduct(row.rows[0], addonGroups) });
});

productRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb();
  await db.execute({ sql: "DELETE FROM products WHERE id = ?", args: [id] });
  return c.json({ ok: true });
});
