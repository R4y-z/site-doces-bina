import { Hono } from "hono";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { HonoEnv } from "../types.js";
import { getStorage, getBucketName } from "../lib/storage.js";

export const imageRoutes = new Hono<HonoEnv>();

// GET /api/images/:key — serve a imagem diretamente do R2 (via S3). Rota
// pública (as fotos do cardápio precisam carregar sem autenticação).
//
// Alternativa mais barata em produção: vincular um domínio customizado ao
// bucket R2 (Cloudflare Dashboard > R2 > seu bucket > Settings > Public
// Access) e usar essa URL direto no imageUrl do produto, sem passar pela
// function. Essa rota aqui funciona sempre, sem configuração extra.
imageRoutes.get("/images/:key{.+}", async (c) => {
  const key = c.req.param("key");

  try {
    const object = await getStorage().send(
      new GetObjectCommand({ Bucket: getBucketName(), Key: key })
    );

    const bytes = await object.Body?.transformToByteArray();
    if (!bytes) return c.notFound();

    const headers = new Headers();
    if (object.ContentType) headers.set("content-type", object.ContentType);
    if (object.ETag) headers.set("etag", object.ETag);
    headers.set("cache-control", "public, max-age=31536000, immutable");

    // Cast por atrito de tipos entre lib DOM e @types/node (Uint8Array
    // genérico do Node 22 vs BodyInit do lib.dom) — no runtime é só bytes.
    return new Response(bytes as BodyInit, { headers });
  } catch (err: any) {
    if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
      return c.notFound();
    }
    throw err;
  }
});
