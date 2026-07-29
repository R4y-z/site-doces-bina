import { createClient, type Client } from "@libsql/client";
import { getEnv } from "./env.js";

// Client singleton — reaproveitado entre invocações da mesma function
// (Vercel mantém o processo Node "quente" entre requests).
let client: Client | null = null;

export function getDb(): Client {
  if (!client) {
    const env = getEnv();
    client = createClient({
      url: env.TURSO_DATABASE_URL,
      authToken: env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}
