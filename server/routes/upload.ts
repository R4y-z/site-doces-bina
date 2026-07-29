import { Hono } from "hono";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import type { HonoEnv } from "../types";
import { requireAdmin } from "../middleware/auth";
import { getStorage, getBucketName } from "../lib/storage";

export const uploadRoutes = new Hono<HonoEnv>();

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

function extFromType(type: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };
  return map[type] ?? "bin";
}

// POST /api/admin/upload — multipart/form-data com campo "file".
// Salva a imagem no bucket R2 (via endpoint S3) e devolve a URL pública
// servida por GET /api/images/:key (ver routes/images.ts).
uploadRoutes.post("/", requireAdmin, async (c) => {
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) {
    return c.json({ error: "Envie um arquivo no campo 'file'." }, 400);
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return c.json({ error: "Tipo de arquivo não suportado. Use JPG, PNG, WEBP, GIF ou AVIF." }, 400);
  }
  if (file.size > MAX_SIZE_BYTES) {
    return c.json({ error: "Arquivo muito grande (máx. 5MB)." }, 400);
  }

  const folder = (c.req.query("folder") || "products").replace(/[^a-z0-9-]/gi, "");
  const key = `${folder}/${crypto.randomUUID()}.${extFromType(file.type)}`;

  await getStorage().send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
    })
  );

  return c.json({ url: `/api/images/${key}`, key }, 201);
});
