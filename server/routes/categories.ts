import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { requireAdmin } from "../middleware/auth";
import { getDb } from "../lib/db";
import { mapCategory } from "../lib/mappers";
import { slugify } from "../lib/slug";

export const categoryRoutes = new Hono<HonoEnv>();

// Todas as rotas aqui são montadas sob /api/admin/categories (ver app.ts)
categoryRoutes.use("*", requireAdmin);

categoryRoutes.get("/", async (c) => {
  const db = getDb();
  const result = await db.execute("SELECT * FROM categories ORDER BY sort_order ASC, name ASC");
  return c.json({ categories: (result.rows as any[]).map(mapCategory) });
});

categoryRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.name) return c.json({ error: "name é obrigatório." }, 400);

  const slug = body.slug ? slugify(body.slug) : slugify(body.name);
  const sortOrder = Number(body.sortOrder ?? 0);
  const db = getDb();

  try {
    const insertResult = await db.execute({
      sql: "INSERT INTO categories (name, slug, sort_order, active) VALUES (?, ?, ?, ?)",
      args: [body.name, slug, sortOrder, body.active === false ? 0 : 1],
    });
    const row = await db.execute({
      sql: "SELECT * FROM categories WHERE id = ?",
      args: [Number(insertResult.lastInsertRowid)],
    });
    return c.json({ category: mapCategory(row.rows[0]) }, 201);
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

  const db = getDb();
  const existingResult = await db.execute({ sql: "SELECT * FROM categories WHERE id = ?", args: [id] });
  const existing = existingResult.rows[0] as any;
  if (!existing) return c.json({ error: "Categoria não encontrada." }, 404);

  const name = body.name ?? existing.name;
  const slug = body.slug ? slugify(body.slug) : existing.slug;
  const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : existing.sort_order;
  const active = body.active !== undefined ? (body.active ? 1 : 0) : existing.active;

  await db.execute({
    sql: "UPDATE categories SET name = ?, slug = ?, sort_order = ?, active = ? WHERE id = ?",
    args: [name, slug, sortOrder, active, id],
  });

  const row = await db.execute({ sql: "SELECT * FROM categories WHERE id = ?", args: [id] });
  return c.json({ category: mapCategory(row.rows[0]) });
});

categoryRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb();
  await db.execute({ sql: "DELETE FROM categories WHERE id = ?", args: [id] });
  return c.json({ ok: true });
});
