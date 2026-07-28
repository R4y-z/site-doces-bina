import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { requireAdmin } from "../middleware/auth";
import { mapCategory } from "../lib/mappers";
import { slugify } from "../lib/slug";

export const categoryRoutes = new Hono<HonoEnv>();

// Todas as rotas aqui são montadas sob /api/admin/categories (ver app.ts)
categoryRoutes.use("*", requireAdmin);

categoryRoutes.get("/", async (c) => {
  const rows = await c.env.DB.prepare("SELECT * FROM categories ORDER BY sort_order ASC, name ASC").all();
  return c.json({ categories: (rows.results as any[]).map(mapCategory) });
});

categoryRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.name) return c.json({ error: "name é obrigatório." }, 400);

  const slug = body.slug ? slugify(body.slug) : slugify(body.name);
  const sortOrder = Number(body.sortOrder ?? 0);

  try {
    const result = await c.env.DB.prepare(
      "INSERT INTO categories (name, slug, sort_order, active) VALUES (?, ?, ?, ?)"
    )
      .bind(body.name, slug, sortOrder, body.active === false ? 0 : 1)
      .run();
    const row = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?")
      .bind(result.meta.last_row_id)
      .first();
    return c.json({ category: mapCategory(row) }, 201);
  } catch (err: any) {
    if (String(err?.message ?? "").includes("UNIQUE")) {
      return c.json({ error: "Já existe uma categoria com esse slug." }, 409);
    }
    throw err;
  }
});

categoryRoutes.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Payload inválido." }, 400);

  const existing = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(id).first();
  if (!existing) return c.json({ error: "Categoria não encontrada." }, 404);

  const name = body.name ?? (existing as any).name;
  const slug = body.slug ? slugify(body.slug) : (existing as any).slug;
  const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : (existing as any).sort_order;
  const active = body.active !== undefined ? (body.active ? 1 : 0) : (existing as any).active;

  await c.env.DB.prepare("UPDATE categories SET name = ?, slug = ?, sort_order = ?, active = ? WHERE id = ?")
    .bind(name, slug, sortOrder, active, id)
    .run();

  const row = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(id).first();
  return c.json({ category: mapCategory(row) });
});

categoryRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await c.env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});
