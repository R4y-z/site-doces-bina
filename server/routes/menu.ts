import { Hono } from "hono";
import type { HonoEnv } from "../types";
import { mapAddonGroup, mapCategory, mapProduct, mapPublicSettings } from "../lib/mappers";

export const menuRoutes = new Hono<HonoEnv>();

// Endpoint único e público consumido pela Home: configurações da loja +
// categorias + produtos (já com os grupos de adicionais). Mantém o
// carregamento inicial em uma única requisição, o que é o que importa para
// um cardápio pequeno/médio de doceria.
menuRoutes.get("/menu", async (c) => {
  const { DB } = c.env;

  const [settingsRow, categoryRows, productRows] = await Promise.all([
    DB.prepare("SELECT * FROM store_settings WHERE id = 1").first(),
    DB.prepare("SELECT * FROM categories WHERE active = 1 ORDER BY sort_order ASC, name ASC").all(),
    DB.prepare("SELECT * FROM products WHERE active = 1 ORDER BY sort_order ASC, name ASC").all(),
  ]);

  const productIds = (productRows.results as any[]).map((p) => p.id);

  let groupRows: any[] = [];
  let optionRows: any[] = [];

  if (productIds.length > 0) {
    const placeholders = productIds.map(() => "?").join(",");
    const groups = await DB.prepare(
      `SELECT * FROM addon_groups WHERE product_id IN (${placeholders}) ORDER BY sort_order ASC, id ASC`
    )
      .bind(...productIds)
      .all();
    groupRows = groups.results as any[];

    const groupIds = groupRows.map((g) => g.id);
    if (groupIds.length > 0) {
      const gPlaceholders = groupIds.map(() => "?").join(",");
      const options = await DB.prepare(
        `SELECT * FROM addon_options WHERE group_id IN (${gPlaceholders}) AND active = 1 ORDER BY sort_order ASC, id ASC`
      )
        .bind(...groupIds)
        .all();
      optionRows = options.results as any[];
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

  const products = (productRows.results as any[]).map((p) => mapProduct(p, groupsByProduct.get(p.id) ?? []));
  const categories = (categoryRows.results as any[]).map(mapCategory);

  return c.json({
    settings: settingsRow ? mapPublicSettings(settingsRow) : null,
    categories,
    products,
  });
});
