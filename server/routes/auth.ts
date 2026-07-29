import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import type { HonoEnv } from "../types.js";
import { getDb } from "../lib/db.js";
import { getEnv, isProduction } from "../lib/env.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "../lib/jwt.js";
import { requireAdmin } from "../middleware/auth.js";

export const authRoutes = new Hono<HonoEnv>();

function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
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
  if (body.setupKey !== getEnv().ADMIN_SETUP_KEY) {
    return c.json({ error: "setupKey inválida." }, 403);
  }
  if (String(body.password).length < 8) {
    return c.json({ error: "A senha deve ter pelo menos 8 caracteres." }, 400);
  }

  const db = getDb();
  const existing = await db.execute("SELECT COUNT(*) as count FROM admin_users");
  const count = existing.rows[0]?.count as number;
  if (count > 0) {
    return c.json({ error: "Já existe um administrador cadastrado." }, 409);
  }

  const passwordHash = await hashPassword(body.password);
  await db.execute({
    sql: "INSERT INTO admin_users (username, password_hash) VALUES (?, ?)",
    args: [body.username, passwordHash],
  });

  return c.json({ ok: true });
});

authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.username || !body?.password) {
    return c.json({ error: "username e password são obrigatórios." }, 400);
  }

  const db = getDb();
  const result = await db.execute({
    sql: "SELECT * FROM admin_users WHERE username = ?",
    args: [body.username],
  });
  const user = result.rows[0] as unknown as
    | { id: number; username: string; password_hash: string }
    | undefined;

  if (!user || !(await verifyPassword(body.password, user.password_hash))) {
    return c.json({ error: "Usuário ou senha inválidos." }, 401);
  }

  const token = await signSession({ sub: String(user.id), username: user.username }, getEnv().JWT_SECRET);
  setCookie(c, SESSION_COOKIE, token, cookieOptions());

  return c.json({ ok: true, admin: { id: user.id, username: user.username } });
});

authRoutes.post("/logout", async (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

authRoutes.get("/me", requireAdmin, async (c) => {
  return c.json({ admin: c.get("admin") });
});
