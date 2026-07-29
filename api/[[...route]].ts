// Entry point das Vercel Functions. Qualquer request para /api/* cai aqui e
// é delegada ao app Hono definido em server/app.ts, sem precisar reescrever
// nenhuma rota — só o adapter muda (era hono/cloudflare-pages, agora é
// hono/vercel). Roda no runtime Node.js (padrão da Vercel quando "runtime"
// não é especificado), necessário pro @libsql/client e pro Buffer usado no
// upload de imagens.
import { handle } from "hono/vercel";
import { app } from "../server/app.js";

export default handle(app);
