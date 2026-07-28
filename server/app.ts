import { Hono } from "hono";
import { logger } from "hono/logger";
import type { HonoEnv } from "./types";
import { authRoutes } from "./routes/auth";
import { menuRoutes } from "./routes/menu";
import { categoryRoutes } from "./routes/categories";
import { productRoutes } from "./routes/products";
import { orderRoutes } from "./routes/orders";
import { settingsRoutes } from "./routes/settings";
import { uploadRoutes } from "./routes/upload";
import { imageRoutes } from "./routes/images";

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
