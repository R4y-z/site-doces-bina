// Entry point das Cloudflare Pages Functions. Qualquer request para
// /api/* cai aqui e é delegada ao app Hono definido em server/app.ts,
// que já roda 100% no runtime de Workers (edge).
import { handle } from "hono/cloudflare-pages";
import { app } from "../../server/app";

export const onRequest = handle(app);
