import { Hono } from "hono";
import { logger } from "hono/logger";
import type { HonoEnv } from "./types.js";
import { authRoutes } from "./routes/auth.js";
import { menuRoutes } from "./routes/menu.js";
import { categoryRoutes } from "./routes/categories.js";
import { productRoutes } from "./routes/products.js";
import { orderRoutes } from "./routes/orders.js";
import { settingsRoutes } from "./routes/settings.js";
import { uploadRoutes } from "./routes/upload.js";
import { imageRoutes } from "./routes/images.js";

export const app = new Hono<HonoEnv>().basePath("/api");

app.use("*", logger());

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Erro interno do servidor." }, 500);
});

app.notFound((c) => c.json({ error: "Rota não encontrada." }, 404));

// Público
app.route("/", menuRoutes); // GET /api/menu
app.route("/", imageRoutes); // GET /api/images/:key
app.route("/orders", orderRoutes); // POST /api/orders (público) + /api/orders/admin/* (protegido)
app.route("/auth", authRoutes); // /api/auth/*

// Admin (cada módulo já aplica requireAdmin internamente)
app.route("/admin/categories", categoryRoutes);
app.route("/admin/products", productRoutes);
app.route("/admin/settings", settingsRoutes);
app.route("/admin/upload", uploadRoutes);

export type AppType = typeof app;
