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
      // use "npm run pages:dev" (wrangler pages dev) que builda e serve tudo junto.
      "/api": "http://127.0.0.1:8788",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
