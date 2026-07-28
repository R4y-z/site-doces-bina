import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import type { HonoEnv } from "../types";
import { hashPassword, verifyPassword } from "../lib/password";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "../lib/jwt";
import { requireAdmin } from "../middleware/auth";

export const authRoutes = new Hono<HonoEnv>();

function cookieOptions(env: HonoEnv["Bindings"]) {
  return {
    httpOnly: true,
    secure: env.APP_ENV !== "development",
    sameSite: "Lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

// Cria o primeiro usuário admin. Só funciona se ainda não existir nenhum
// admin cadastrado E a chave de setup confere com o segredo ADMIN_SETUP_KEY.
authRoutes.post("/setup", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.username || !body?.password || !body?.setupKey) {
    return c.json({ error: "username, password e setupKey são obrigatórios." }, 400);
  }
  if (body.setupKey !== c.env.ADMIN_SETUP_KEY) {
    return c.json({ error: "setupKey inválida." }, 403);
  }
  if (String(body.password).length < 8) {
    return c.json({ error: "A senha deve ter pelo menos 8 caracteres." }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT COUNT(*) as count FROM admin_users").first<{ count: number }>();
  if (existing && existing.count > 0) {
    return c.json({ error: "Já existe um administrador cadastrado." }, 409);
  }

  const passwordHash = await hashPassword(body.password);
  await c.env.DB.prepare("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)")
    .bind(body.username, passwordHash)
    .run();

  return c.json({ ok: true });
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.username || !body?.password) {
    return c.json({ error: "username e password são obrigatórios." }, 400);
  }

  const user = await c.env.DB.prepare("SELECT * FROM admin_users WHERE username = ?")
    .bind(body.username)
    .first<{ id: number; username: string; password_hash: string }>();

  if (!user || !(await verifyPassword(body.password, user.password_hash))) {
    return c.json({ error: "Usuário ou senha inválidos." }, 401);
  }

  const token = await signSession({ sub: String(user.id), username: user.username }, c.env.JWT_SECRET);
  setCookie(c, SESSION_COOKIE, token, cookieOptions(c.env));

  return c.json({ ok: true, admin: { id: user.id, username: user.username } });
});

authRoutes.post("/logout", async (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

authRoutes.get("/me", requireAdmin, async (c) => {
  return c.json({ admin: c.get("admin") });
});
