// Bindings disponíveis no runtime da Cloudflare (Pages Functions).
// Configurados em wrangler.toml (DB, IMAGES) e via `wrangler pages secret put`
// ou dashboard (JWT_SECRET, ADMIN_SETUP_KEY).
export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;
  JWT_SECRET: string;
  ADMIN_SETUP_KEY: string;
  APP_ENV?: string;
}

export type HonoEnv = {
  Bindings: Env;
  Variables: {
    admin: { id: number; username: string };
  };
};
