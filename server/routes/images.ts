import { Hono } from "hono";
import type { HonoEnv } from "../types";

export const imageRoutes = new Hono<HonoEnv>();

// GET /api/images/:key — serve a imagem diretamente do R2. Rota pública
// (as fotos do cardápio precisam carregar sem autenticação).
//
// Alternativa mais barata em produção: vincular um domínio customizado ao
// bucket R2 (Cloudflare Dashboard > R2 > seu bucket > Settings > Public
// Access) e usar essa URL direto no imageUrl do produto, sem passar pelo
// Worker. Essa rota aqui funciona sempre, sem configuração extra.
imageRoutes.get("/images/:key{.+}", async (c) => {
  const key = c.req.param("key");
  const object = await c.env.IMAGES.get(key);

  if (!object) return c.notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
});
