import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import type { HonoEnv } from "../types.js";
import { SESSION_COOKIE, verifySession } from "../lib/jwt.js";
import { getEnv } from "../lib/env.js";

// Lê e valida o cookie de sessão sem interromper a request — usado tanto
// pelo middleware requireAdmin quanto por rotas públicas que precisam
// checar "esse request veio de um admin logado?" sem exigir login (ex:
// POST /api/orders com isManualEntry).
export async function getSessionAdmin(c: Context<HonoEnv>): Promise<{ id: number; username: string } | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;

  const session = await verifySession(token, getEnv().JWT_SECRET);
  if (!session) return null;

  return { id: Number(session.sub), username: session.username };
}

export const requireAdmin = createMiddleware<HonoEnv>(async (c, next) => {
  const admin = await getSessionAdmin(c);
  if (!admin) return c.json({ error: "Não autenticado." }, 401);

  c.set("admin", admin);
  await next();
});
