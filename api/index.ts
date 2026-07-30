// Entry point das Vercel Functions. Um vercel.json com rewrite manda todo
// tráfego de /api/* pra cá (ver vercel.json na raiz) — o roteamento por
// nome de arquivo com colchetes ([[...route]].ts) não reconhece de forma
// confiável paths aninhados tipo /api/auth/me fora do Next.js, então
// seguimos o padrão do template oficial vercel/hono-starter: um arquivo
// fixo + rewrite. O Hono continua vendo a URL original (o rewrite não
// altera o path que chega no Request), então server/app.ts roteia tudo
// normalmente a partir daqui, sem reescrever nenhuma rota.
import { handle } from "hono/vercel";
import { app } from "../server/app.js";

export const runtime = "nodejs";

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
