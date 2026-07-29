import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import type { HonoEnv } from "../types.js";
import { SESSION_COOKIE, verifySession } from "../lib/jwt.js";
import { getEnv } from "../lib/env.js";

export const requireAdmin = createMiddleware<HonoEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ error: "Não autenticado." }, 401);

  const session = await verifySession(token, getEnv().JWT_SECRET);
  if (!session) return c.json({ error: "Sessão inválida ou expirada." }, 401);

  c.set("admin", { id: Number(session.sub), username: session.username });
  await next();
});
