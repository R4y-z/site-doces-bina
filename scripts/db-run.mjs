#!/usr/bin/env node
// Roda um arquivo .sql (schema.sql ou seed.sql) contra o banco Turso/libSQL
// apontado por TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN, se houver).
//
// Uso:
//   dotenv -e .env.local -- node scripts/db-run.mjs schema.sql
//   dotenv -e .env -- node scripts/db-run.mjs seed.sql
//
// (os scripts "db:migrate:*" / "db:seed:*" do package.json já fazem isso)

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";

const fileArg = process.argv[2];
if (!fileArg) {
  console.error("Uso: node scripts/db-run.mjs <arquivo.sql>");
  process.exit(1);
}

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("TURSO_DATABASE_URL não definido. Configure .env.local ou .env (veja .env.example).");
  process.exit(1);
}

const filePath = resolve(process.cwd(), fileArg);
const sql = await readFile(filePath, "utf8");

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

console.log(`Executando ${fileArg} em ${url}...`);
await client.executeMultiple(sql);
console.log("OK.");

client.close();
