import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@server": path.resolve(__dirname, "./server"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Durante "npm run dev" o front roda no Vite; para testar as Functions
      // use "npm run vercel:dev" (vercel dev, porta padrão 3000) em paralelo.
      "/api": "http://127.0.0.1:3000",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
