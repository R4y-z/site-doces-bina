import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { getDb } from "../lib/db";
import { mapAddonGroup, mapCategory, mapProduct, mapPublicSettings } from "../lib/mappers";

export const menuRoutes = new Hono<HonoEnv>();

// Endpoint único e público consumido pela Home: configurações da loja +
// categorias + produtos (já com os grupos de adicionais). Mantém o
// carregamento inicial em uma única requisição, o que é o que importa para
// um cardápio pequeno/médio de doceria.
menuRoutes.get("/menu", async (c) => {
  const db = getDb();

  const [settingsResult, categoryResult, productResult] = await Promise.all([
    db.execute("SELECT * FROM store_settings WHERE id = 1"),
    db.execute("SELECT * FROM categories WHERE active = 1 ORDER BY sort_order ASC, name ASC"),
    db.execute("SELECT * FROM products WHERE active = 1 ORDER BY sort_order ASC, name ASC"),
  ]);

  const settingsRow = settingsResult.rows[0];
  const productRows = productResult.rows as any[];
  const categoryRows = categoryResult.rows as any[];

  const productIds = productRows.map((p) => p.id);

  let groupRows: any[] = [];
  let optionRows: any[] = [];

  if (productIds.length > 0) {
    const placeholders = productIds.map(() => "?").join(",");
    const groupsResult = await db.execute({
      sql: `SELECT * FROM addon_groups WHERE product_id IN (${placeholders}) ORDER BY sort_order ASC, id ASC`,
      args: productIds,
    });
    groupRows = groupsResult.rows as any[];

    const groupIds = groupRows.map((g) => g.id);
    if (groupIds.length > 0) {
      const gPlaceholders = groupIds.map(() => "?").join(",");
      const optionsResult = await db.execute({
        sql: `SELECT * FROM addon_options WHERE group_id IN (${gPlaceholders}) AND active = 1 ORDER BY sort_order ASC, id ASC`,
        args: groupIds,
      });
      optionRows = optionsResult.rows as any[];
    }
  }

  const optionsByGroup = new Map<number, any[]>();
  for (const opt of optionRows) {
    const list = optionsByGroup.get(opt.group_id) ?? [];
    list.push(opt);
    optionsByGroup.set(opt.group_id, list);
  }

  const groupsByProduct = new Map<number, any[]>();
  for (const g of groupRows) {
    const mapped = mapAddonGroup(g, optionsByGroup.get(g.id) ?? []);
    const list = groupsByProduct.get(g.product_id) ?? [];
    list.push(mapped);
    groupsByProduct.set(g.product_id, list);
  }

  const products = productRows.map((p) => mapProduct(p, groupsByProduct.get(p.id) ?? []));
  const categories = categoryRows.map(mapCategory);

  return c.json({
    settings: settingsRow ? mapPublicSettings(settingsRow) : null,
    categories,
    products,
  });
});
