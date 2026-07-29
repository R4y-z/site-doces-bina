// Leitura centralizada das variáveis de ambiente (process.env), com
// validação antecipada. Evita espalhar `process.env.X!` pelas rotas e dá um
// erro claro e imediato se algo obrigatório não estiver configurado.

export interface AppEnv {
  JWT_SECRET: string;
  ADMIN_SETUP_KEY: string;
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN?: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ACCOUNT_ID: string;
  R2_BUCKET_NAME: string;
}

const REQUIRED_KEYS = [
  "JWT_SECRET",
  "ADMIN_SETUP_KEY",
  "TURSO_DATABASE_URL",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ACCOUNT_ID",
  "R2_BUCKET_NAME",
] as const satisfies readonly (keyof AppEnv)[];

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;

  const missing = REQUIRED_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente ausentes: ${missing.join(", ")}. Veja .env.example.`);
  }

  cached = {
    JWT_SECRET: process.env.JWT_SECRET!,
    ADMIN_SETUP_KEY: process.env.ADMIN_SETUP_KEY!,
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL!,
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN || undefined,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID!,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY!,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID!,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME!,
  };
  return cached;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
